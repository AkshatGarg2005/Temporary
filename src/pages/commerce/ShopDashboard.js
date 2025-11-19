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
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const ShopDashboard = () => {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

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

  const createProduct = async (e) => {
    e.preventDefault();
    if (!name || !category || !price) return;

    await addDoc(collection(db, 'products'), {
      shopId: user.uid,
      name,
      category,
      price: parseFloat(price),
      stock: stock ? parseInt(stock, 10) : null,
      isAvailable: true,
      createdAt: serverTimestamp(),
    });

    setName('');
    setCategory('');
    setPrice('');
    setStock('');
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
      <h1>Quick Commerce (Shop)</h1>

      <h2>Add product</h2>
      <form
        onSubmit={createProduct}
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
          Category
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
          Stock (optional)
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>

        <button type="submit">Add product</button>
      </form>

      <h2>Your products</h2>
      <ul>
        {products.map((p) => (
          <li key={p.id} style={{ marginBottom: '8px' }}>
            {p.name} ({p.category}) | ₹{p.price}{' '}
            {p.stock != null && <span>| Stock: {p.stock}</span>}{' '}
            | Available: {p.isAvailable ? 'Yes' : 'No'}
            <button
              onClick={() => toggleAvailability(p)}
              style={{ marginLeft: '8px' }}
            >
              Toggle availability
            </button>
          </li>
        ))}
        {products.length === 0 && <p>No products yet.</p>}
      </ul>

      <h2>Orders to fulfill</h2>
      <ul>
        {orders.map((o) => {
          const product = products.find((p) => p.id === o.productId);
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
                Product:{' '}
                {product ? product.name : o.productId}
              </div>
              <div>Quantity: {o.quantity}</div>
              <div>Customer: {o.customerId}</div>
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

export default ShopDashboard;
