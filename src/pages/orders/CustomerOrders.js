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
  const [hostProfiles, setHostProfiles] = useState({});
  const [doctorProfiles, setDoctorProfiles] = useState({});

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
    if (c.status !== 'pending') return;
    await updateDoc(doc(db, 'cabRequests', c.id), {
      status: 'cancelled',
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

  return (
    <div>
      <h1>My Orders</h1>

      {/* Quick commerce */}
      <section>
        <h2>Quick commerce orders</h2>
        <ul>
          {commerceOrders.map((o) => {
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
              </li>
            );
          })}
          {commerceOrders.length === 0 && <p>No commerce orders.</p>}
        </ul>
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
                {driver && (
                  <div>
                    Driver: {driver.name}
                    {driver.phone && ` (Phone: ${driver.phone})`}
                  </div>
                )}
                {c.status === 'pending' && (
                  <button
                    onClick={() => cancelCab(c)}
                    style={{ marginTop: '4px' }}
                  >
                    Cancel
                  </button>
                )}
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
          {serviceRequests.map((s) => (
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
                {(s.status === 'pending' || s.status === 'quoted') && (
                  <button onClick={() => cancelService(s)}>
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
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

      {/* Medical consultations */}
      <section>
        <h2>Doctor consultations</h2>
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
            <p>No consultations.</p>
          )}
        </ul>
      </section>
    </div>
  );
};

export default CustomerOrders;
