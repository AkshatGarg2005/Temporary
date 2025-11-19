import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [mine, setMine] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});
  const [patientProfiles, setPatientProfiles] = useState({});

  useEffect(() => {
    if (!user) return;

    const qPending = query(
      collection(db, 'medicalConsultations'),
      where('status', '==', 'pending')
    );
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qMine = query(
      collection(db, 'medicalConsultations'),
      where('doctorId', '==', user.uid)
    );
    const unsubMine = onSnapshot(qMine, (snapshot) => {
      setMine(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPending();
      unsubMine();
    };
  }, [user]);

  // Load patient names & phone numbers
  useEffect(() => {
    const loadPatients = async () => {
      const all = [...pending, ...mine];
      const ids = Array.from(
        new Set(all.map((c) => c.customerId).filter(Boolean))
      );

      for (const id of ids) {
        if (patientProfiles[id]) continue;
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const data = snap.data();
            setPatientProfiles((prev) => ({
              ...prev,
              [id]: data,
            }));
          }
        } catch (err) {
          console.error('Failed to fetch patient profile', err);
        }
      }
    };

    if (pending.length > 0 || mine.length > 0) {
      loadPatients();
    }
  }, [pending, mine, patientProfiles]);

  const acceptConsultation = async (c) => {
    await updateDoc(doc(db, 'medicalConsultations', c.id), {
      doctorId: user.uid,
      status: 'accepted',
    });
  };

  const saveDetails = async (c) => {
    const notesValue = notes[c.id] ?? c.notes ?? '';
    const prescriptionValue =
      prescriptions[c.id] ?? c.prescription ?? '';
    await updateDoc(doc(db, 'medicalConsultations', c.id), {
      notes: notesValue,
      prescription: prescriptionValue,
    });
  };

  const markCompleted = async (c) => {
    await updateDoc(doc(db, 'medicalConsultations', c.id), {
      status: 'completed',
    });
  };

  return (
    <div>
      <h1>Doctor Dashboard</h1>

      <h2>Pending consultations</h2>
      <ul>
        {pending.map((c) => {
          const patient = patientProfiles[c.customerId];
          return (
            <li
              key={c.id}
              style={{
                marginBottom: '8px',
                padding: '6px',
                border: '1px solid #ccc',
              }}
            >
              <div>
                Patient:{' '}
                {patient ? patient.name : c.customerId}
                {patient?.phone &&
                  ` (Phone: ${patient.phone})`}
              </div>
              <div>Symptoms: {c.symptoms}</div>
              {c.preferredTime && <div>Preferred: {c.preferredTime}</div>}
              <button onClick={() => acceptConsultation(c)}>Accept</button>
            </li>
          );
        })}
        {pending.length === 0 && <p>No pending consultations.</p>}
      </ul>

      <h2>Your consultations</h2>
      <ul>
        {mine.map((c) => {
          const patient = patientProfiles[c.customerId];
          return (
            <li
              key={c.id}
              style={{
                marginBottom: '8px',
                padding: '6px',
                border: '1px solid #ccc',
              }}
            >
              <div>Status: {c.status}</div>
              <div>
                Patient:{' '}
                {patient ? patient.name : c.customerId}
                {patient?.phone &&
                  ` (Phone: ${patient.phone})`}
              </div>
              <div>Symptoms: {c.symptoms}</div>
              <div>
                Notes:
                <textarea
                  value={notes[c.id] ?? c.notes ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                Prescription (medicine list / instructions):
                <textarea
                  value={prescriptions[c.id] ?? c.prescription ?? ''}
                  onChange={(e) =>
                    setPrescriptions((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                />
              </div>
              <div style={{ marginTop: '4px' }}>
                <button onClick={() => saveDetails(c)}>Save details</button>
                {c.status === 'accepted' && (
                  <button
                    onClick={() => markCompleted(c)}
                    style={{ marginLeft: '8px' }}
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {mine.length === 0 && <p>No consultations yet.</p>}
      </ul>
    </div>
  );
};

export default DoctorDashboard;
