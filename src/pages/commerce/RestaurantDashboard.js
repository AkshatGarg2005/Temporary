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

const RestaurantDashboard = () => {
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [isVeg, setIsVeg] = useState(false);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customerProfiles, setCustomerProfiles] = useState({});

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

    const createFoodItem = async (e) => {
        e.preventDefault();
        if (!name || !category || !price) return;

        await addDoc(collection(db, 'products'), {
            shopId: user.uid,
            name,
            category,
            price: parseFloat(price),
            isVeg,
            isAvailable: true,
            type: 'food', // Distinguish from normal products if needed
            createdAt: serverTimestamp(),
        });

        setName('');
        setCategory('');
        setPrice('');
        setIsVeg(false);
    };

    const toggleAvailability = async (product) => {
        await updateDoc(doc(db, 'products', product.id), {
            isAvailable: !product.isAvailable,
        });
    };

    const updateOrderStatus = async (order, status) => {
        await updateDoc(doc(db, 'commerceOrders', order.id), {
            status,
        });
    };

    return (
        <div>
            <h1>Restaurant Dashboard</h1>

            <h2>Add Food Item</h2>
            <form
                onSubmit={createFoodItem}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '400px',
                }}
            >
                <label>
                    Name
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Category (e.g., Starter, Main Course)
                    <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Price
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                    />
                </label>

                <label>
                    <input
                        type="checkbox"
                        checked={isVeg}
                        onChange={(e) => setIsVeg(e.target.checked)}
                    />
                    Vegetarian
                </label>

                <button type="submit">Add Item</button>
            </form>

            <h2>Your Menu</h2>
            <ul>
                {products.map((p) => (
                    <li key={p.id} style={{ marginBottom: '8px' }}>
                        {p.name} ({p.category}) | ₹{p.price} | {p.isVeg ? 'Veg' : 'Non-Veg'}{' '}
                        | Available: {p.isAvailable ? 'Yes' : 'No'}
                        <button
                            onClick={() => toggleAvailability(p)}
                            style={{ marginLeft: '8px' }}
                        >
                            Toggle availability
                        </button>
                    </li>
                ))}
                {products.length === 0 && <p>No items yet.</p>}
            </ul>

            <h2>Orders to fulfill</h2>
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
                                Item:{' '}
                                {product ? product.name : o.productId}
                            </div>
                            <div>Quantity: {o.quantity}</div>
                            {o.specialRequest && (
                                <div style={{ color: 'red', fontWeight: 'bold' }}>
                                    Special Request: {o.specialRequest}
                                </div>
                            )}
                            <div>
                                Customer:{' '}
                                {customer ? customer.name : o.customerId}
                                {customer?.phone &&
                                    ` (Phone: ${customer.phone})`}
                            </div>
                            <div>Address: {o.address}</div>
                            <div>Status: {o.status}</div>
                            <div style={{ marginTop: '4px' }}>
                                {o.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() =>
                                                updateOrderStatus(o, 'accepted')
                                            }
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() =>
                                                updateOrderStatus(o, 'rejected')
                                            }
                                            style={{ marginLeft: '8px' }}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                                {o.status === 'accepted' && (
                                    <button
                                        onClick={() =>
                                            updateOrderStatus(
                                                o,
                                                'ready_for_delivery'
                                            )
                                        }
                                    >
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

export default RestaurantDashboard;
