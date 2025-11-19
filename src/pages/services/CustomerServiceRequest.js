import React, { useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description || !address) return;

    await addDoc(collection(db, 'serviceRequests'), {
      customerId: user.uid,
      category,
      description,
      address,
      scheduledTime: scheduledTime || null,
      status: 'pending',
      workerId: null,
      proposedPrice: null,
      proposedByWorkerId: null,
      createdAt: serverTimestamp(),
    });

    setDescription('');
    setAddress('');
    setScheduledTime('');
  };

  return (
    <div>
      <h1>Service on Rent (Customer)</h1>
      <p>Your service requests are available in the "My Orders" page.</p>

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
    </div>
  );
};

export default CustomerServiceRequest;
