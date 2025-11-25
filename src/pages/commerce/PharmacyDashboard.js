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

const PharmacyDashboard = () => {
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [brand, setBrand] = useState('');
    const [genericName, setGenericName] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customerProfiles, setCustomerProfiles] = useState({});
    const [rejectionReason, setRejectionReason] = useState({});
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState({});

    useEffect(() => {
        // Fetch doctors
        const qDoctors = query(
            collection(db, 'users'),
            where('role', '==', 'DOCTOR')
        );
        const unsubDoctors = onSnapshot(qDoctors, (snapshot) => {
            setDoctors(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubDoctors();
    }, []);

    useEffect(() => {
        if (!user) return;

        const qProducts = query(
            collection(db, 'products'),
            where('shopId', '==', user.uid)
        );
        const unsubProducts = onSnapshot(qProducts, (snapshot) => {
            setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        const qOrders = query(
            collection(db, 'commerceOrders'),
            where('shopId', '==', user.uid)
        );
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubProducts();
            unsubOrders();
        };
    }, [user]);

    useEffect(() => {
        const loadCustomers = async () => {
            const ids = Array.from(
                new Set(orders.map((o) => o.customerId).filter(Boolean))
            );
            const profiles = {};
            for (const id of ids) {
                try {
                    const snap = await getDoc(doc(db, 'users', id));
                    if (snap.exists()) {
                        profiles[id] = snap.data();
                    }
                } catch (err) {
                    console.error('Failed to fetch customer profile', err);
                }
            }
            setCustomerProfiles(profiles);
        };

        if (orders.length > 0) {
            loadCustomers();
        } else {
            setCustomerProfiles({});
        }
    }, [orders]);

    const addMedicine = async (e) => {
        e.preventDefault();
        if (!name || !price || !expiryDate) return;

        await addDoc(collection(db, 'products'), {
            shopId: user.uid,
            name,
            dose,
            brand,
            genericName,
            batchNumber,
            expiryDate,
            price: parseFloat(price),
            stock: stock ? parseInt(stock, 10) : 0,
            isAvailable: true,
            type: 'medicine',
            createdAt: serverTimestamp(),
        });

        setName('');
        setDose('');
        setBrand('');
        setGenericName('');
        setBatchNumber('');
        setExpiryDate('');
        setPrice('');
        setStock('');
    };

    const toggleAvailability = async (product) => {
        await updateDoc(doc(db, 'products', product.id), {
            isAvailable: !product.isAvailable,
        });
    };

    const updateOrderStatus = async (order, status, reason = null) => {
        const updateData = { status };
        if (reason) updateData.rejectionReason = reason;

        await updateDoc(doc(db, 'commerceOrders', order.id), updateData);
    };

    const handleRejectionReasonChange = (orderId, value) => {
        setRejectionReason(prev => ({ ...prev, [orderId]: value }));
    };

    const isExpired = (dateString) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    const forwardToDoctor = async (order) => {
        const doctorId = selectedDoctor[order.id];
        if (!doctorId) {
            alert('Please select a doctor to forward to.');
            return;
        }
        await updateDoc(doc(db, 'commerceOrders', order.id), {
            status: 'pending_doctor_approval',
            forwardedToDoctorId: doctorId,
        });
    };

    return (
        <div>
            <h1>Pharmacy Dashboard</h1>

            <h2>Add Medicine</h2>
            <form
                onSubmit={addMedicine}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '400px',
                }}
            >
                <label>
                    Medicine Name
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label>
                    Dose (e.g., 500mg)
                    <input value={dose} onChange={(e) => setDose(e.target.value)} />
                </label>
                <label>
                    Brand
                    <input value={brand} onChange={(e) => setBrand(e.target.value)} />
                </label>
                <label>
                    Generic Name (for substitutes)
                    <input value={genericName} onChange={(e) => setGenericName(e.target.value)} />
                </label>
                <label>
                    Batch Number
                    <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                </label>
                <label>
                    Expiry Date
                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                </label>
                <label>
                    Price
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </label>
                <label>
                    Stock
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
                </label>

                <button type="submit">Add Medicine</button>
            </form>

            <h2>Inventory</h2>
            <ul>
                {products.map((p) => (
                    <li key={p.id} style={{ marginBottom: '8px', color: isExpired(p.expiryDate) ? 'red' : 'inherit' }}>
                        <strong>{p.name}</strong> {p.dose} | {p.brand} | ₹{p.price}
                        <br />
                        Generic: {p.genericName} | Batch: {p.batchNumber} | Exp: {p.expiryDate} {isExpired(p.expiryDate) ? '(EXPIRED)' : ''}
                        <br />
                        Stock: {p.stock} | Available: {p.isAvailable ? 'Yes' : 'No'}
                        <button
                            onClick={() => toggleAvailability(p)}
                            style={{ marginLeft: '8px' }}
                        >
                            Toggle availability
                        </button>
                    </li>
                ))}
                {products.length === 0 && <p>No medicines added.</p>}
            </ul>

            <h2>Orders</h2>
            <ul>
                {orders.map((o) => {
                    const product = products.find((p) => p.id === o.productId);
                    const customer = customerProfiles[o.customerId];
                    return (
                        <li
                            key={o.id}
                            style={{
                                marginBottom: '8px',
                                padding: '6px',
                                border: '1px solid #ccc',
                            }}
                        >
                            <div>Order ID: {o.id}</div>
                            <div>
                                Medicine: {product ? `${product.name} ${product.dose}` : o.productId}
                            </div>
                            <div>Quantity: {o.quantity}</div>
                            {o.prescriptionUrl && (
                                <div style={{ margin: '5px 0', padding: '5px', background: '#f0f0f0' }}>
                                    <strong>Prescription:</strong>
                                    {o.prescriptionUrl.startsWith('http') ? (
                                        <a href={o.prescriptionUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                                            View File
                                        </a>
                                    ) : (
                                        <span style={{ marginLeft: '5px' }}>{o.prescriptionUrl}</span>
                                    )}
                                </div>
                            )}
                            <div>
                                Customer: {customer ? customer.name : o.customerId}
                                {customer?.phone && ` (Phone: ${customer.phone})`}
                            </div>
                            <div>Status: <strong>{o.status}</strong></div>

                            <div style={{ marginTop: '4px' }}>
                                {o.status === 'pending_prescription_review' && (
                                    <>
                                        <button onClick={() => updateOrderStatus(o, 'accepted')}>
                                            Approve & Accept
                                        </button>
                                        <div style={{ marginTop: '5px' }}>
                                            <input
                                                placeholder="Rejection Reason"
                                                value={rejectionReason[o.id] || ''}
                                                onChange={(e) => handleRejectionReasonChange(o.id, e.target.value)}
                                            />
                                            <button
                                                onClick={() => updateOrderStatus(o, 'rejected', rejectionReason[o.id] || 'Prescription invalid')}
                                                style={{ marginLeft: '5px' }}
                                            >
                                                Reject
                                            </button>
                                        </div>

                                        <div style={{ marginTop: '10px', padding: '5px', border: '1px dashed #999' }}>
                                            <strong>Or Forward to Doctor:</strong>
                                            <br />
                                            <select
                                                value={selectedDoctor[o.id] || ''}
                                                onChange={(e) => setSelectedDoctor(prev => ({ ...prev, [o.id]: e.target.value }))}
                                                style={{ marginRight: '5px' }}
                                            >
                                                <option value="">-- Select Doctor --</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => forwardToDoctor(o)}>Forward</button>
                                        </div>
                                    </>
                                )}

                                {o.status === 'pending_doctor_approval' && (
                                    <div style={{ color: 'orange', fontWeight: 'bold' }}>
                                        Waiting for Doctor Approval...
                                    </div>
                                )}

                                {o.status === 'accepted' && (
                                    <button onClick={() => updateOrderStatus(o, 'ready_for_delivery')}>
                                        Mark ready for delivery
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
                {orders.length === 0 && <p>No orders yet.</p>}
            </ul>
        </div>
    );
};

export default PharmacyDashboard;
