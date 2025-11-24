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

import ChatWindow from '../../components/ChatWindow';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [mine, setMine] = useState([]);
  const [notes, setNotes] = useState({});
  const [prescriptions, setPrescriptions] = useState({});
  const [patientProfiles, setPatientProfiles] = useState({});
  const [activeChatRequestId, setActiveChatRequestId] = useState(null);

  // Doctor's own profile data
  const [myDescription, setMyDescription] = useState('');
  const [myFee, setMyFee] = useState('');

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

  // Load doctor's own profile
  useEffect(() => {
    if (!user) return;
    const loadMyProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setMyDescription(data.description || '');
        setMyFee(data.consultationFee || '');
      }
    };
    loadMyProfile();
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

  const saveProfile = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      description: myDescription,
      consultationFee: myFee ? parseFloat(myFee) : 0,
    });
    alert('Profile updated!');
  };

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

      <div
        style={{
          marginBottom: '20px',
          padding: '10px',
          border: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3>Your Profile Settings</h3>
        <div style={{ marginBottom: '8px' }}>
          <label>
            Description (visible to patients):
            <br />
            <textarea
              value={myDescription}
              onChange={(e) => setMyDescription(e.target.value)}
              style={{ width: '100%', height: '60px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <label>
            Consultation Fee (₹):
            <input
              type="number"
              value={myFee}
              onChange={(e) => setMyFee(e.target.value)}
              style={{ marginLeft: '8px' }}
            />
          </label>
        </div>
        <button onClick={saveProfile}>Save Profile</button>
      </div>

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
                Patient: {patient ? patient.name : c.customerId}
                {/* Phone hidden until accepted */}
              </div>
              <div>Symptoms: {c.symptoms}</div>
              {patient?.medicalHistory && (
                <div>Medical History: {patient.medicalHistory}</div>
              )}
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
          const currentPrescription =
            prescriptions[c.id] ?? c.prescription ?? '';

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
                Patient: {patient ? patient.name : c.customerId}
                {patient?.phone && ` (Phone: ${patient.phone})`}
              </div>
              {patient?.medicalHistory && (
                <div>Medical History: {patient.medicalHistory}</div>
              )}
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
                  style={{ display: 'block', width: '100%', marginTop: '4px' }}
                />
              </div>
              <div>
                Prescription (medicine list / instructions):
                <textarea
                  value={currentPrescription}
                  onChange={(e) =>
                    setPrescriptions((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: '4px' }}
                />
              </div>
              <div style={{ marginTop: '4px' }}>
                <button onClick={() => saveDetails(c)}>Save details</button>
                {c.status === 'accepted' && (
                  <button
                    onClick={() => markCompleted(c)}
                    style={{ marginLeft: '8px' }}
                    disabled={!currentPrescription.trim()}
                    title={
                      !currentPrescription.trim()
                        ? 'Prescription required to complete'
                        : ''
                    }
                  >
                    Mark completed
                  </button>
                )}
                {(c.status === 'accepted' || c.status === 'completed') && (
                  <button
                    onClick={() => setActiveChatRequestId(c.id)}
                    style={{ marginLeft: '8px' }}
                  >
                    Chat
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {mine.length === 0 && <p>No consultations yet.</p>}
      </ul>

      {activeChatRequestId && (
        <ChatWindow
          requestId={activeChatRequestId}
          currentUser={user}
          onClose={() => setActiveChatRequestId(null)}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
