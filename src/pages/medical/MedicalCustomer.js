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
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const MedicalCustomer = () => {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [consultations, setConsultations] = useState([]);
  const [doctorProfiles, setDoctorProfiles] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'medicalConsultations'),
      where('customerId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Load doctor names & phone numbers
  useEffect(() => {
    const loadDoctors = async () => {
      const ids = Array.from(
        new Set(
          consultations
            .map((c) => c.doctorId)
            .filter(Boolean)
        )
      );

      for (const id of ids) {
        if (doctorProfiles[id]) continue;
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const data = snap.data();
            setDoctorProfiles((prev) => ({
              ...prev,
              [id]: data,
            }));
          }
        } catch (err) {
          console.error('Failed to fetch doctor profile', err);
        }
      }
    };

    if (consultations.length > 0) {
      loadDoctors();
    }
  }, [consultations, doctorProfiles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms) return;

    await addDoc(collection(db, 'medicalConsultations'), {
      customerId: user.uid,
      doctorId: null,
      symptoms,
      preferredTime: preferredTime || null,
      status: 'pending', // pending, accepted, completed, cancelled
      notes: '',
      prescription: '',
      createdAt: serverTimestamp(),
    });

    setSymptoms('');
    setPreferredTime('');
  };

  const cancelConsultation = async (c) => {
    if (c.status !== 'pending') return;
    await updateDoc(doc(db, 'medicalConsultations', c.id), {
      status: 'cancelled',
    });
  };

  return (
    <div>
      <h1>Medical Consultation (Customer)</h1>

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

      <h2>Your consultations</h2>
      <ul>
        {consultations.map((c) => {
          const doctor = c.doctorId
            ? doctorProfiles[c.doctorId]
            : null;
          return (
            <li
              key={c.id}
              style={{
                marginBottom: '8px',
                padding: '6px',
                border: '1px solid #ccc',
              }}
            >
              <div>Symptoms: {c.symptoms}</div>
              <div>Status: {c.status}</div>
              {doctor && (
                <div>
                  Doctor: {doctor.name}
                  {doctor.phone && ` (Phone: ${doctor.phone})`}
                </div>
              )}
              {c.prescription && (
                <div>Prescription: {c.prescription}</div>
              )}
              {c.status === 'pending' && (
                <button
                  onClick={() => cancelConsultation(c)}
                  style={{ marginTop: '4px' }}
                >
                  Cancel
                </button>
              )}
            </li>
          );
        })}
        {consultations.length === 0 && (
          <p>No consultations yet.</p>
        )}
      </ul>
    </div>
  );
};

export default MedicalCustomer;
