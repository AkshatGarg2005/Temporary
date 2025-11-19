import React, { useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const MedicalCustomer = () => {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms) return;

    await addDoc(collection(db, 'medicalConsultations'), {
      customerId: user.uid,
      doctorId: null,
      symptoms,
      preferredTime: preferredTime || null,
      status: 'pending',
      notes: '',
      prescription: '',
      createdAt: serverTimestamp(),
    });

    setSymptoms('');
    setPreferredTime('');
  };

  return (
    <div>
      <h1>Medical Consultation (Customer)</h1>
      <p>Your consultations are available in the "My Orders" page.</p>

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
          Describe your symptoms
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            required
          />
        </label>

        <label>
          Preferred time (optional)
          <input
            type="datetime-local"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
          />
        </label>

        <button type="submit">Request consultation</button>
      </form>
    </div>
  );
};

export default MedicalCustomer;
