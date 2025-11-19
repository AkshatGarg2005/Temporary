import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const uploadImageToCloudinary = async (file) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary config missing');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Cloudinary upload failed');
  }
  return data.secure_url;
};

const HostProperties = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('BOTH');
  const [pricePerDay, setPricePerDay] = useState('');
  const [pricePerMonth, setPricePerMonth] = useState('');
  const [facilities, setFacilities] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [properties, setProperties] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const qProps = query(
      collection(db, 'properties'),
      where('hostId', '==', user.uid)
    );
    const unsubProps = onSnapshot(qProps, (snapshot) => {
      setProperties(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qBookings = query(
      collection(db, 'bookings'),
      where('hostId', '==', user.uid)
    );
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setHostBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubProps();
      unsubBookings();
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImageToCloudinary(imageFile);
        setUploadingImage(false);
      }

      const facilitiesArr = facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      await addDoc(collection(db, 'properties'), {
        hostId: user.uid,
        title,
        address,
        description,
        propertyType,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
        facilities: facilitiesArr,
        imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setAddress('');
      setDescription('');
      setPropertyType('BOTH');
      setPricePerDay('');
      setPricePerMonth('');
      setFacilities('');
      setImageFile(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create property');
      setUploadingImage(false);
    }
  };

  const toggleActive = async (property) => {
    await updateDoc(doc(db, 'properties', property.id), {
      isActive: !property.isActive,
    });
  };

  const confirmBooking = async (booking) => {
    if (booking.status !== 'pending') return;
    await updateDoc(doc(db, 'bookings', booking.id), {
      status: 'confirmed',
    });
  };

  const cancelBooking = async (booking) => {
    if (booking.status === 'cancelled') return;
    await updateDoc(doc(db, 'bookings', booking.id), {
      status: 'cancelled',
    });
  };

  return (
    <div>
      <h1>Host Properties</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '500px',
        }}
      >
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          Address
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <label>
          Property type
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="SHORT_TERM">Short term (like hotel)</option>
            <option value="LONG_TERM">Long term (rental)</option>
            <option value="BOTH">Both</option>
          </select>
        </label>

        <label>
          Price per day (for short term)
          <input
            type="number"
            value={pricePerDay}
            onChange={(e) => setPricePerDay(e.target.value)}
          />
        </label>

        <label>
          Price per month (for long term)
          <input
            type="number"
            value={pricePerMonth}
            onChange={(e) => setPricePerMonth(e.target.value)}
          />
        </label>

        <label>
          Facilities (comma separated)
          <input
            value={facilities}
            onChange={(e) => setFacilities(e.target.value)}
          />
        </label>

        <label>
          Image (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
        </label>

        <button type="submit" disabled={uploadingImage}>
          {uploadingImage ? 'Uploading image...' : 'Create property'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Your properties</h2>
      <ul>
        {properties.map((p) => (
          <li
            key={p.id}
            style={{
              marginBottom: '10px',
              padding: '8px',
              border: '1px solid #ccc',
            }}
          >
            <strong>{p.title}</strong> ({p.propertyType}) | Active:{' '}
            {p.isActive ? 'Yes' : 'No'}
            <div>{p.address}</div>
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt={p.title}
                style={{
                  maxWidth: '200px',
                  display: 'block',
                  marginTop: '4px',
                }}
              />
            )}
            <button
              onClick={() => toggleActive(p)}
              style={{ marginTop: '4px' }}
            >
              Toggle active
            </button>
          </li>
        ))}
        {properties.length === 0 && <p>No properties yet.</p>}
      </ul>

      <h2>Bookings for your properties</h2>
      <ul>
        {hostBookings.map((b) => {
          const prop = properties.find((p) => p.id === b.propertyId);
          return (
            <li
              key={b.id}
              style={{
                marginBottom: '8px',
                padding: '6px',
                border: '1px solid #ccc',
              }}
            >
              <div>
                Property:{' '}
                {prop ? prop.title : b.propertyId}
              </div>
              <div>
                Stay type: {b.stayType} | {b.startDate}
                {b.endDate && b.endDate !== b.startDate && ` → ${b.endDate}`}
              </div>
              <div>Status: {b.status}</div>
              {b.status === 'pending' && (
                <>
                  <button onClick={() => confirmBooking(b)}>
                    Confirm booking
                  </button>
                  <button
                    onClick={() => cancelBooking(b)}
                    style={{ marginLeft: '8px' }}
                  >
                    Cancel
                  </button>
                </>
              )}
              {b.status === 'confirmed' && (
                <button onClick={() => cancelBooking(b)}>
                  Cancel booking
                </button>
              )}
            </li>
          );
        })}
        {hostBookings.length === 0 && (
          <p>No bookings for your properties yet.</p>
        )}
      </ul>
    </div>
  );
};

export default HostProperties;
