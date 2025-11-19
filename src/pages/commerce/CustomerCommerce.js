import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const CustomerCommerce = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');

  useEffect(() => {
    // All shops
    const qShops = query(
      collection(db, 'users'),
      where('role', '==', 'SHOP')
    );
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Products from all shops (we filter by shopId in UI)
    const qProducts = query(
      collection(db, 'products'),
      where('isAvailable', '==', true)
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubShops();
      unsubProducts();
    };
  }, []);

  const shopProducts = selectedShop
    ? products.filter((p) => p.shopId === selectedShop.id)
    : [];

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !address || !quantity) return;

    await addDoc(collection(db, 'commerceOrders'), {
      customerId: user.uid,
      shopId: selectedProduct.shopId,
      productId: selectedProduct.id,
      quantity: parseInt(quantity, 10),
      status: 'pending',
      deliveryPartnerId: null,
      address,
      createdAt: serverTimestamp(),
    });

    setQuantity(1);
    setAddress('');
  };

  return (
    <div>
      <h1>Quick Commerce (Customer)</h1>
      <p>Your order history is available in the "My Orders" page.</p>

      <h2>Shops</h2>
      <ul>
        {shops.map((s) => (
          <li key={s.id} style={{ marginBottom: '6px' }}>
            <div>
              <strong>{s.name}</strong>
            </div>
            {s.address && <div>Address: {s.address}</div>}
            {s.phone && <div>Phone: {s.phone}</div>}
            <button
              onClick={() => {
                setSelectedShop(s);
                setSelectedProduct(null);
              }}
              style={{ marginTop: '4px' }}
            >
              View products
            </button>
          </li>
        ))}
        {shops.length === 0 && <p>No shops found.</p>}
      </ul>

      {selectedShop && (
        <div style={{ marginTop: '16px' }}>
          <h2>Products from {selectedShop.name}</h2>
          <ul>
            {shopProducts.map((p) => (
              <li key={p.id} style={{ marginBottom: '6px' }}>
                <div>
                  <strong>{p.name}</strong> ({p.category}) | ₹{p.price}
                </div>
                {p.stock != null && <div>Stock: {p.stock}</div>}
                <button
                  onClick={() => setSelectedProduct(p)}
                  style={{ marginTop: '4px' }}
                >
                  Select product
                </button>
              </li>
            ))}
            {shopProducts.length === 0 && (
              <p>No products for this shop.</p>
            )}
          </ul>
        </div>
      )}

      {selectedProduct && (
        <div style={{ marginTop: '16px' }}>
          <h2>Order: {selectedProduct.name}</h2>
          <form
            onSubmit={placeOrder}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxWidth: '400px',
            }}
          >
            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </label>

            <label>
              Delivery address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </label>

            <button type="submit">Place order</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerCommerce;
