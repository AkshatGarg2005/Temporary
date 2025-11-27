import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

import ChatWindow from '../../components/ChatWindow';

const CustomerOrders = () => {
  const { user } = useAuth();
  const [commerceOrders, setCommerceOrders] = useState([]);
  const [cabRequests, setCabRequests] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [housingBookings, setHousingBookings] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [products, setProducts] = useState([]);

  const [shopProfiles, setShopProfiles] = useState({});
  const [deliveryProfiles, setDeliveryProfiles] = useState({});
  const [driverProfiles, setDriverProfiles] = useState({});
  const [workerProfiles, setWorkerProfiles] = useState({});
  const [hostProfiles, setHostProfiles] = useState({});
  const [doctorProfiles, setDoctorProfiles] = useState({});

  const [activeChatRequestId, setActiveChatRequestId] = useState(null);

  // State for editing symptoms
  const [editingSymptomId, setEditingSymptomId] = useState(null);
  const [tempSymptomText, setTempSymptomText] = useState('');

  const handlePayConsultation = async (consultation, fee) => {
    // In a real app, integrate payment gateway here.
    // For now, just update the lastPaymentDate.
    if (window.confirm(`Pay consultation fee of ₹${fee}?`)) {
      await updateDoc(doc(db, 'medicalConsultations', consultation.id), {
        lastPaymentDate: serverTimestamp(),
      });
      alert('Payment successful! You can now chat with the doctor for 24 hours.');
    }
  };

  const updateSymptoms = async (consultation, newSymptoms) => {
    if (!newSymptoms.trim()) return;
    await updateDoc(doc(db, 'medicalConsultations', consultation.id), {
      symptoms: newSymptoms,
    });
    alert('Symptoms updated!');
  };

  useEffect(() => {
    if (!user) return;

    const qCommerce = query(
      collection(db, 'commerceOrders'),
      where('customerId', '==', user.uid)
    );
    const unsubCommerce = onSnapshot(qCommerce, (snapshot) => {
      setCommerceOrders(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    const qCab = query(
      collection(db, 'cabRequests'),
      where('customerId', '==', user.uid)
    );
    const unsubCab = onSnapshot(qCab, (snapshot) => {
      setCabRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qService = query(
      collection(db, 'serviceRequests'),
      where('customerId', '==', user.uid)
    );
    const unsubService = onSnapshot(qService, (snapshot) => {
      setServiceRequests(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    const qHousing = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );
    const unsubHousing = onSnapshot(qHousing, (snapshot) => {
      setHousingBookings(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    const qMed = query(
      collection(db, 'medicalConsultations'),
      where('customerId', '==', user.uid)
    );
    const unsubMed = onSnapshot(qMed, (snapshot) => {
      setConsultations(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubCommerce();
      unsubCab();
      unsubService();
      unsubHousing();
      unsubMed();
      unsubProducts();
    };
  }, [user]);

  // Shops for commerce orders
  useEffect(() => {
    const loadShops = async () => {
      const ids = Array.from(
        new Set(
          commerceOrders
            .map((o) => o.shopId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch shop profile', err);
        }
      }
      setShopProfiles(profiles);
    };
    if (commerceOrders.length > 0) {
      loadShops();
    } else {
      setShopProfiles({});
    }
  }, [commerceOrders]);

  // Delivery partners for commerce orders
  useEffect(() => {
    const loadDelivery = async () => {
      const ids = Array.from(
        new Set(
          commerceOrders
            .map((o) => o.deliveryPartnerId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch delivery profile', err);
        }
      }
      setDeliveryProfiles(profiles);
    };
    if (commerceOrders.length > 0) {
      loadDelivery();
    } else {
      setDeliveryProfiles({});
    }
  }, [commerceOrders]);

  // Drivers for cab requests
  useEffect(() => {
    const loadDrivers = async () => {
      const ids = Array.from(
        new Set(
          cabRequests
            .map((c) => c.driverId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch driver profile', err);
        }
      }
      setDriverProfiles(profiles);
    };
    if (cabRequests.length > 0) {
      loadDrivers();
    } else {
      setDriverProfiles({});
    }
  }, [cabRequests]);

  // Hosts for housing bookings
  useEffect(() => {
    const loadHosts = async () => {
      const ids = Array.from(
        new Set(
          housingBookings
            .map((b) => b.hostId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch host profile', err);
        }
      }
      setHostProfiles(profiles);
    };
    if (housingBookings.length > 0) {
      loadHosts();
    } else {
      setHostProfiles({});
    }
  }, [housingBookings]);

  // Workers for service requests
  useEffect(() => {
    const loadWorkers = async () => {
      const ids = Array.from(
        new Set(
          serviceRequests
            .map((s) => s.workerId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch worker profile', err);
        }
      }
      setWorkerProfiles(profiles);
    };
    if (serviceRequests.length > 0) {
      loadWorkers();
    } else {
      setWorkerProfiles({});
    }
  }, [serviceRequests]);

  // Doctors for consultations
  useEffect(() => {
    const loadDoctors = async () => {
      const ids = Array.from(
        new Set(
          consultations
            .map((c) => c.doctorId)
            .filter(Boolean)
        )
      );
      const profiles = {};
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            profiles[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch doctor profile', err);
        }
      }
      setDoctorProfiles(profiles);
    };
    if (consultations.length > 0) {
      loadDoctors();
    } else {
      setDoctorProfiles({});
    }
  }, [consultations]);

  // Actions

  const cancelCab = async (c) => {
    if (c.status !== 'pending' && c.status !== 'quoted') return;
    await updateDoc(doc(db, 'cabRequests', c.id), {
      status: 'cancelled',
    });
  };

  const acceptCabQuote = async (c) => {
    if (
      c.status !== 'quoted' ||
      !c.proposedByDriverId ||
      typeof c.proposedPrice !== 'number'
    ) {
      return;
    }
    await updateDoc(doc(db, 'cabRequests', c.id), {
      status: 'accepted',
      driverId: c.proposedByDriverId,
    });
  };

  const cancelService = async (s) => {
    if (s.status !== 'pending' && s.status !== 'quoted') return;
    await updateDoc(doc(db, 'serviceRequests', s.id), {
      status: 'cancelled',
    });
  };

  const acceptServiceQuote = async (s) => {
    if (
      s.status !== 'quoted' ||
      !s.proposedByWorkerId ||
      typeof s.proposedPrice !== 'number'
    ) {
      return;
    }
    await updateDoc(doc(db, 'serviceRequests', s.id), {
      status: 'accepted',
      workerId: s.proposedByWorkerId,
    });
  };

  const cancelBooking = async (b) => {
    if (b.status !== 'pending' && b.status !== 'confirmed') return;
    await updateDoc(doc(db, 'bookings', b.id), {
      status: 'cancelled',
    });
  };

  const cancelConsultation = async (c) => {
    if (c.status !== 'pending') return;
    await updateDoc(doc(db, 'medicalConsultations', c.id), {
      status: 'cancelled',
    });
  };

  const cancelSubscription = async (order) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      await updateDoc(doc(db, 'commerceOrders', order.id), {
        isRepeatable: false,
        repeatFrequency: null,
      });
      alert('Subscription cancelled.');
    }
  };

  const reorder = async (order) => {
    try {
      await addDoc(collection(db, 'cartItems'), {
        userId: user.uid,
        shopId: order.shopId,
        productId: order.productId,
        quantity: order.quantity,
        specialRequest: order.specialRequest || null,
        createdAt: serverTimestamp(),
      });
      alert('Item added to cart!');
    } catch (err) {
      console.error(err);
    }
  };

  const cancelCommerceOrder = async (order) => {
    if (order.status !== 'pending') return;
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await updateDoc(doc(db, 'commerceOrders', order.id), {
          status: 'cancelled',
        });
        alert('Order cancelled successfully.');
      } catch (err) {
        console.error(err);
        alert('Failed to cancel order.');
      }
    }
  };

  const renderOrderList = (orders) => {
    if (orders.length === 0) return <p>No orders.</p>;
    return (
      <ul>
        {orders.map((o) => {
          const product = products.find((p) => p.id === o.productId);
          const shop = shopProfiles[o.shopId];
          const delivery =
            o.deliveryPartnerId && o.status !== 'delivered'
              ? deliveryProfiles[o.deliveryPartnerId]
              : null;

          return (
            <li
              key={o.id}
              style={{
                marginBottom: '8px',
                padding: '6px',
                border: '1px solid #ccc',
              }}
            >
              <div>
                Product:{' '}
                {product ? product.name : o.productId} | Qty:{' '}
                {o.quantity} | Status: {o.status}
              </div>
              <div>
                Shop:{' '}
                {shop ? shop.name : o.shopId}
                {shop?.address && ` | Address: ${shop.address}`}
                {shop?.phone && ` | Phone: ${shop.phone}`}
              </div>
              <div>Delivery address: {o.address}</div>
              {delivery && (
                <div>
                  Delivery partner: {delivery.name}
                  {delivery.phone && ` (Phone: ${delivery.phone})`}
                </div>
              )}
              {o.status === 'out_for_delivery' && o.deliveryOtp && (
                <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#e0f7fa', border: '1px solid #006064' }}>
                  <strong>Delivery OTP: {o.deliveryOtp}</strong>
                  <br />
                  <small>Share this code with the delivery partner upon arrival.</small>
                </div>
              )}
              {o.status === 'pending_doctor_approval' && (
                <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#fff3e0', border: '1px solid orange' }}>
                  <strong>Status: Pending Doctor Approval</strong>
                  <br />
                  <small>The pharmacy has forwarded your prescription to a doctor for review.</small>
                </div>
              )}
              {o.status === 'rejected' && o.rejectionReason && (
                <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#ffebee', border: '1px solid #c62828' }}>
                  <strong>Rejected:</strong> {o.rejectionReason}
                </div>
              )}

              {o.isRepeatable && (
                <div style={{ marginTop: '10px', padding: '5px', border: '1px dashed #2196F3', backgroundColor: '#E3F2FD' }}>
                  <strong>Subscription Active:</strong> Repeats Monthly
                  <button
                    onClick={() => cancelSubscription(o)}
                    style={{ marginLeft: '10px', fontSize: '0.8em', backgroundColor: '#FF9800', color: 'white', border: 'none', padding: '3px 8px', cursor: 'pointer' }}
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
              <div style={{ marginTop: '5px' }}>
                <button onClick={() => reorder(o)}>
                  Reorder
                </button>
                {o.status === 'pending' && (
                  <button
                    onClick={() => cancelCommerceOrder(o)}
                    style={{ marginLeft: '8px', backgroundColor: '#d32f2f', color: 'white' }}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };
  return (
    <div>
      <h1>My Orders</h1>

      {/* Quick commerce */}
      <section>
        <h2>Quick Commerce Orders</h2>
        {renderOrderList(commerceOrders.filter(o => {
          const shop = shopProfiles[o.shopId];
          return !shop || (shop.role !== 'RESTAURANT' && shop.role !== 'PHARMACY');
        }))}
      </section>

      {/* Food Delivery */}
      <section>
        <h2>Food Delivery Orders</h2>
        {renderOrderList(commerceOrders.filter(o => {
          const shop = shopProfiles[o.shopId];
          return shop && shop.role === 'RESTAURANT';
        }))}
      </section>

      {/* Medicine Delivery */}
      <section>
        <h2>Medicine Orders</h2>
        {renderOrderList(commerceOrders.filter(o => {
          const shop = shopProfiles[o.shopId];
          return shop && shop.role === 'PHARMACY';
        }))}
      </section>

      {/* Cab */}
      <section>
        <h2>Cab bookings</h2>
        <ul>
          {cabRequests.map((c) => {
            const driver =
              c.driverId && c.status === 'accepted'
                ? driverProfiles[c.driverId]
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
                <div>
                  {c.pickupLocation} → {c.dropLocation} | Status:{' '}
                  {c.status}
                </div>
                {c.status === 'quoted' && typeof c.proposedPrice === 'number' && (
                  <div>
                    Driver quote: ₹{c.proposedPrice}
                  </div>
                )}
                {driver && (
                  <div>
                    Driver: {driver.name}
                    {driver.phone && ` (Phone: ${driver.phone})`}
                  </div>
                )}
                {c.rideOtp && c.status !== 'completed' && (
                  <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#e0f7fa', border: '1px solid #006064' }}>
                    <strong>Ride OTP: {c.rideOtp}</strong>
                    <br />
                    <small>Share this code with the driver to START the ride.</small>
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  {c.status === 'quoted' && (
                    <button
                      onClick={() => acceptCabQuote(c)}
                      style={{ marginRight: '8px' }}
                    >
                      Accept quote
                    </button>
                  )}
                  {(c.status === 'quoted' ||
                    c.status === 'accepted') && (
                      <button
                        onClick={() => setActiveChatRequestId(c.id)}
                        style={{ marginRight: '8px' }}
                      >
                        Chat
                      </button>
                    )}
                  {(c.status === 'pending' || c.status === 'quoted') && (
                    <button
                      onClick={() => cancelCab(c)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {cabRequests.length === 0 && <p>No cab bookings.</p>}
        </ul>
      </section>

      {/* Services */}
      <section>
        <h2>Service requests</h2>
        <ul>
          {serviceRequests.map((s) => {
            const worker =
              s.workerId && s.status === 'accepted'
                ? workerProfiles[s.workerId]
                : null;

            return (
              <li
                key={s.id}
                style={{
                  marginBottom: '8px',
                  padding: '6px',
                  border: '1px solid #ccc',
                }}
              >
                <div>
                  [{s.category}] {s.description} | Status: {s.status}
                </div>
                <div>Address: {s.address}</div>
                {typeof s.proposedPrice === 'number' && (
                  <div>Worker quote: ₹{s.proposedPrice}</div>
                )}
                {worker && s.status === 'accepted' && (
                  <div>
                    Worker: {worker.name}
                    {worker.phone && ` (Phone: ${worker.phone})`}
                  </div>
                )}
                {s.status === 'in_progress' && s.serviceOtp && (
                  <div style={{ marginTop: '5px', padding: '5px', backgroundColor: '#e0f7fa', border: '1px solid #006064' }}>
                    <strong>Service OTP: {s.serviceOtp}</strong>
                    <br />
                    <small>Share this code with the worker to complete the job.</small>
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  {s.status === 'quoted' &&
                    s.proposedByWorkerId &&
                    typeof s.proposedPrice === 'number' && (
                      <button
                        onClick={() => acceptServiceQuote(s)}
                        style={{ marginRight: '8px' }}
                      >
                        Accept quote
                      </button>
                    )}
                  {(s.status === 'quoted' ||
                    s.status === 'accepted') && (
                      <button
                        onClick={() => setActiveChatRequestId(s.id)}
                        style={{ marginRight: '8px' }}
                      >
                        Chat
                      </button>
                    )}
                  {(s.status === 'pending' || s.status === 'quoted') && (
                    <button onClick={() => cancelService(s)}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {serviceRequests.length === 0 && (
            <p>No service requests.</p>
          )}
        </ul>
      </section>

      {/* Housing */}
      <section>
        <h2>Housing bookings</h2>
        <ul>
          {housingBookings.map((b) => {
            const host =
              b.status === 'confirmed'
                ? hostProfiles[b.hostId]
                : null;
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
                  Property: {b.propertyId} | {b.stayType} |{' '}
                  {b.startDate}
                  {b.endDate &&
                    b.endDate !== b.startDate &&
                    ` → ${b.endDate}`}{' '}
                  | Status: {b.status}
                </div>
                {host && (
                  <div>
                    Host: {host.name}
                    {host.phone && ` (Phone: ${host.phone})`}
                  </div>
                )}
                {(b.status === 'pending' ||
                  b.status === 'confirmed') && (
                    <button
                      onClick={() => cancelBooking(b)}
                      style={{ marginTop: '4px' }}
                    >
                      Cancel
                    </button>
                  )}
              </li>
            );
          })}
          {housingBookings.length === 0 && (
            <p>No housing bookings.</p>
          )}
        </ul>
      </section>


      <section>
        <h2>Doctor consultations</h2>
        <ul>
          {consultations.map((c) => {
            const doctor = c.doctorId
              ? doctorProfiles[c.doctorId]
              : null;

            // Check if paid today
            let isPaidToday = false;
            if (c.lastPaymentDate) {
              const lastPay = c.lastPaymentDate.toDate();
              const now = new Date();
              const isSameDay =
                lastPay.getDate() === now.getDate() &&
                lastPay.getMonth() === now.getMonth() &&
                lastPay.getFullYear() === now.getFullYear();
              isPaidToday = isSameDay;
            }

            const canChatOrPay = c.status === 'accepted' || c.status === 'completed';
            const showChat = canChatOrPay && isPaidToday;
            const showPay =
              canChatOrPay &&
              !isPaidToday &&
              doctor?.consultationFee > 0;

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
                  Symptoms: {c.symptoms} | Status: {c.status}
                </div>
                {/* Symptom update for active/completed cases */}
                {canChatOrPay && (
                  <div style={{ marginTop: '4px' }}>
                    {editingSymptomId === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <textarea
                          value={tempSymptomText}
                          onChange={(e) => setTempSymptomText(e.target.value)}
                          style={{ width: '100%', height: '60px' }}
                        />
                        <div>
                          <button
                            onClick={() => {
                              updateSymptoms(c, tempSymptomText);
                              setEditingSymptomId(null);
                              setTempSymptomText('');
                            }}
                            style={{ marginRight: '8px' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingSymptomId(null);
                              setTempSymptomText('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingSymptomId(c.id);
                          setTempSymptomText(c.symptoms);
                        }}
                      >
                        Update Symptoms
                      </button>
                    )}
                  </div>
                )}

                {doctor && (
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    Doctor: {doctor.name}
                    <br />
                    About: {doctor.description || 'No description'}
                    <br />
                    Fee: ₹{doctor.consultationFee || 0}
                  </div>
                )}
                {canChatOrPay && isPaidToday && doctor?.phone && (
                  <div>Doctor Phone: {doctor.phone}</div>
                )}
                {c.prescription && (
                  <div style={{ marginTop: '4px', color: 'green' }}>
                    <strong>Prescription:</strong> {c.prescription}
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  {showPay && (
                    <button
                      onClick={() =>
                        handlePayConsultation(c, doctor.consultationFee)
                      }
                      style={{ marginRight: '8px' }}
                    >
                      Pay ₹{doctor.consultationFee} to Chat
                    </button>
                  )}
                  {showChat && (
                    <button
                      onClick={() => setActiveChatRequestId(c.id)}
                      style={{ marginRight: '8px' }}
                    >
                      Chat
                    </button>
                  )}
                  {c.status === 'pending' && (
                    <button
                      onClick={() => cancelConsultation(c)}
                      style={{ marginTop: '4px' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {consultations.length === 0 && (
            <p>No consultations.</p>
          )}
        </ul>
      </section>

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

export default CustomerOrders;
