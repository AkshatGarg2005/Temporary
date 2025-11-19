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

const WorkerDashboard = () => {
  const { user, profile } = useAuth();
  const [openRequests, setOpenRequests] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [customerProfiles, setCustomerProfiles] = useState({});

  const expertiseCategory = profile?.expertiseCategory || '';

  useEffect(() => {
    if (!user || !expertiseCategory) return;

    // Requests for this category (we filter by status in JS)
    const qOpen = query(
      collection(db, 'serviceRequests'),
      where('category', '==', expertiseCategory)
    );

    const unsubOpen = onSnapshot(qOpen, (snapshot) => {
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((r) => {
        if (r.status === 'pending') return true;
        if (r.status === 'quoted' && r.proposedByWorkerId === user.uid) {
          return true;
        }
        return false;
      });
      setOpenRequests(filtered);
    });

    const qMy = query(
      collection(db, 'serviceRequests'),
      where('workerId', '==', user.uid)
    );
    const unsubMy = onSnapshot(qMy, (snapshot) => {
      setMyJobs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOpen();
      unsubMy();
    };
  }, [user, expertiseCategory]);

  // Load customer profiles for accepted/completed jobs
  useEffect(() => {
    const loadProfiles = async () => {
      const ids = Array.from(
        new Set(
          myJobs
            .map((j) => j.customerId)
            .filter(Boolean)
        )
      );

      for (const id of ids) {
        if (customerProfiles[id]) continue;
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            const data = snap.data();
            setCustomerProfiles((prev) => ({
              ...prev,
              [id]: data,
            }));
          }
        } catch (err) {
          console.error('Failed to fetch customer profile', err);
        }
      }
    };

    if (myJobs.length > 0) {
      loadProfiles();
    }
  }, [myJobs, customerProfiles]);

  const handleQuoteChange = (id, value) => {
    setQuotes((prev) => ({ ...prev, [id]: value }));
  };

  const sendQuote = async (request) => {
    const priceStr = quotes[request.id];
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (Number.isNaN(price) || price <= 0) return;

    await updateDoc(doc(db, 'serviceRequests', request.id), {
      proposedPrice: price,
      proposedByWorkerId: user.uid,
      status: 'quoted',
    });
  };

  const markCompleted = async (job) => {
    if (job.status !== 'accepted') return;
    await updateDoc(doc(db, 'serviceRequests', job.id), {
      status: 'completed',
    });
  };

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h1>Worker Dashboard</h1>
      {!expertiseCategory && (
        <p style={{ color: 'red' }}>
          You have not set your expertise category yet. Go to "My Profile" and
          select your category to start receiving jobs.
        </p>
      )}

      {expertiseCategory && (
        <>
          <h2>Open requests for: {expertiseCategory}</h2>
          <ul>
            {openRequests.map((r) => (
              <li
                key={r.id}
                style={{
                  marginBottom: '10px',
                  padding: '8px',
                  border: '1px solid #ccc',
                }}
              >
                <div>
                  <strong>{r.category}</strong> | Status: {r.status}
                </div>
                <div>Customer ID: {r.customerId}</div>
                <div>Problem: {r.description}</div>
                {r.scheduledTime && (
                  <div>Preferred time: {r.scheduledTime}</div>
                )}
                <div style={{ marginTop: '4px' }}>
                  <label>
                    Your estimated price (₹)
                    <input
                      type="number"
                      value={quotes[r.id] ?? (r.proposedPrice || '')}
                      onChange={(e) =>
                        handleQuoteChange(r.id, e.target.value)
                      }
                      style={{ marginLeft: '4px' }}
                    />
                  </label>
                  <button
                    onClick={() => sendQuote(r)}
                    style={{ marginLeft: '8px' }}
                  >
                    {r.status === 'quoted' ? 'Update quote' : 'Send quote'}
                  </button>
                </div>
              </li>
            ))}
            {openRequests.length === 0 && (
              <p>No open requests for your category right now.</p>
            )}
          </ul>
        </>
      )}

      <h2>Your accepted jobs</h2>
      <ul>
        {myJobs.map((job) => {
          const customer = customerProfiles[job.customerId];
          const canSeeDetails =
            job.status === 'accepted' || job.status === 'completed';

          return (
            <li
              key={job.id}
              style={{
                marginBottom: '10px',
                padding: '8px',
                border: '1px solid #ccc',
              }}
            >
              <div>
                <strong>{job.category}</strong> | Status: {job.status}
              </div>
              <div>Problem: {job.description}</div>
              {canSeeDetails && (
                <>
                  <div>
                    Customer:{' '}
                    {customer ? customer.name : job.customerId}
                    {customer?.phone &&
                      ` (Phone: ${customer.phone})`}
                  </div>
                  <div>Address: {job.address}</div>
                </>
              )}
              {job.status === 'accepted' && (
                <button
                  onClick={() => markCompleted(job)}
                  style={{ marginTop: '4px' }}
                >
                  Mark completed
                </button>
              )}
            </li>
          );
        })}
        {myJobs.length === 0 && <p>No accepted jobs yet.</p>}
      </ul>
    </div>
  );
};

export default WorkerDashboard;
