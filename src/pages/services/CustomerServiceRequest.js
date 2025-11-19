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
import { SERVICE_CATEGORIES } from '../../serviceCategories';

const CustomerServiceRequest = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState(
    SERVICE_CATEGORIES[0] || ''
  );
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'serviceRequests'),
      where('customerId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description || !address) return;

    await addDoc(collection(db, 'serviceRequests'), {
      customerId: user.uid,
      category,
      description,
      address,
      scheduledTime: scheduledTime || null,
      status: 'pending', // pending, quoted, accepted, completed, cancelled
      workerId: null,
      proposedPrice: null,
      proposedByWorkerId: null,
      createdAt: serverTimestamp(),
    });

    setDescription('');
    setAddress('');
    setScheduledTime('');
  };

  const cancelRequest = async (request) => {
    if (
      request.status !== 'pending' &&
      request.status !== 'quoted'
    ) {
      return;
    }
    await updateDoc(doc(db, 'serviceRequests', request.id), {
      status: 'cancelled',
    });
  };

  const acceptQuote = async (request) => {
    if (
      request.status !== 'quoted' ||
      !request.proposedByWorkerId ||
      typeof request.proposedPrice !== 'number'
    ) {
      return;
    }
    await updateDoc(doc(db, 'serviceRequests', request.id), {
      status: 'accepted',
      workerId: request.proposedByWorkerId,
    });
  };

  return (
    <div>
      <h1>Service on Rent (Customer)</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '400px',
        }}
      >
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {SERVICE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label>
          Problem description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          Preferred time (optional)
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </label>

        <button type="submit">Create service request</button>
      </form>

      <h2>Your service requests</h2>
      <ul>
        {requests.map((r) => (
          <li
            key={r.id}
            style={{
              marginBottom: '8px',
              padding: '6px',
              border: '1px solid #ccc',
            }}
          >
            <div>
              <strong>{r.category}</strong> | Status: {r.status}
            </div>
            <div>{r.description}</div>
            {typeof r.proposedPrice === 'number' && (
              <div>Worker quote: ₹{r.proposedPrice}</div>
            )}
            {r.status === 'quoted' &&
              r.proposedByWorkerId &&
              typeof r.proposedPrice === 'number' && (
                <button
                  onClick={() => acceptQuote(r)}
                  style={{ marginRight: '8px', marginTop: '4px' }}
                >
                  Accept quote
                </button>
              )}
            {(r.status === 'pending' || r.status === 'quoted') && (
              <button
                onClick={() => cancelRequest(r)}
                style={{ marginTop: '4px' }}
              >
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomerServiceRequest;
