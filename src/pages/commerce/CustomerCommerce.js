import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const CustomerCommerce = ({ mode = 'all' }) => {
  const { user, profile, loading } = useAuth();
  const [shops, setShops] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  useEffect(() => {
    // All shops (users with role SHOP)
    const qShops = query(
      collection(db, 'users'),
      where('role', '==', 'SHOP')
    );
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // All restaurants (users with role RESTAURANT)
    const qRestaurants = query(
      collection(db, 'users'),
      where('role', '==', 'RESTAURANT')
    );
    const unsubRestaurants = onSnapshot(qRestaurants, (snapshot) => {
      setRestaurants(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // All available products (we filter by shopId in UI)
    const qProducts = query(
      collection(db, 'products'),
      where('isAvailable', '==', true)
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubShops();
      unsubRestaurants();
      unsubProducts();
    };
  }, []);

  if (loading || !profile) {
    return <div>Loading...</div>;
  }

  const savedAddress = profile.address || '';

  const shopProducts = selectedShop
    ? products.filter((p) => p.shopId === selectedShop.id)
    : [];

  const selectShop = (shop) => {
    setSelectedShop(shop);
    setMessage('');
    setError('');
    setSpecialRequest('');
  };

  const addToCart = async (product) => {
    setMessage('');
    setError('');

    if (!savedAddress) {
      setError(
        'Please set your address in My Profile before adding items to cart.'
      );
      return;
    }

    try {
      // We keep one cart item doc per (userId, productId, specialRequest)
      // Note: If specialRequest differs, it should be a new item.
      // Firestore query for exact match including specialRequest might be tricky if field is missing.
      // For simplicity, let's query by userId and productId, then filter in JS or just add new doc always if specialRequest is present.
      // To keep it simple and robust:
      // If specialRequest is present, ALWAYS add a new item (don't merge).
      // If no specialRequest, try to merge with existing item that has NO specialRequest.

      let existingItem = null;

      if (!specialRequest) {
        const q = query(
          collection(db, 'cartItems'),
          where('userId', '==', user.uid),
          where('productId', '==', product.id)
        );
        const snap = await getDocs(q);
        // Find one that has no specialRequest
        existingItem = snap.docs.find(d => !d.data().specialRequest);
      }

      if (!existingItem) {
        // New item
        await addDoc(collection(db, 'cartItems'), {
          userId: user.uid,
          shopId: product.shopId,
          productId: product.id,
          quantity: 1,
          specialRequest: specialRequest || null,
          createdAt: serverTimestamp(),
        });
      } else {
        // Increment existing quantity
        const currentQty = existingItem.data().quantity || 1;
        await updateDoc(existingItem.ref, {
          quantity: currentQty + 1,
        });
      }

      setMessage('Added to cart. You can review and place order from the Cart page.');
      setSpecialRequest('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to add to cart');
    }
  };

  const showShops = mode === 'all' || mode === 'shop';
  const showRestaurants = mode === 'all' || mode === 'restaurant';

  let title = 'Quick Commerce & Food Delivery';
  if (mode === 'shop') title = 'Quick Commerce (Shops)';
  if (mode === 'restaurant') title = 'Food Delivery (Restaurants)';

  return (
    <div>
      <h1>{title}</h1>
      <p>
        Your order history is in the <strong>"My Orders"</strong> page.
        Adding items here will store them in your <strong>Cart</strong>.
      </p>

      <p>
        <strong>Using your saved address:</strong>{' '}
        {savedAddress
          ? savedAddress
          : 'No address set. Go to "My Profile" and set your address.'}
      </p>

      {message && (
        <p style={{ color: 'green', marginTop: '8px' }}>{message}</p>
      )}
      {error && (
        <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Shops list */}
        {showShops && (
          <div style={{ flex: 1 }}>
            <h2>Shops</h2>
            <ul>
              {shops.map((s) => (
                <li key={s.id} style={{ marginBottom: '6px' }}>
                  <div>
                    <strong>{s.name}</strong>
                  </div>
                  {s.address && <div>Address: {s.address}</div>}
                  <button
                    onClick={() => selectShop(s)}
                    style={{ marginTop: '4px' }}
                  >
                    View products
                  </button>
                </li>
              ))}
              {shops.length === 0 && <p>No shops found.</p>}
            </ul>
          </div>
        )}

        {/* Restaurants list */}
        {showRestaurants && (
          <div style={{ flex: 1 }}>
            <h2>Restaurants</h2>
            <ul>
              {restaurants.map((r) => (
                <li key={r.id} style={{ marginBottom: '6px' }}>
                  <div>
                    <strong>{r.name}</strong>
                  </div>
                  {r.address && <div>Address: {r.address}</div>}
                  <button
                    onClick={() => selectShop(r)}
                    style={{ marginTop: '4px' }}
                  >
                    View Menu
                  </button>
                </li>
              ))}
              {restaurants.length === 0 && <p>No restaurants found.</p>}
            </ul>
          </div>
        )}
      </div>

      {/* Products of selected shop/restaurant */}
      {selectedShop && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
          <h2>Items from {selectedShop.name} ({selectedShop.role === 'RESTAURANT' ? 'Restaurant' : 'Shop'})</h2>
          <ul>
            {shopProducts.map((p) => (
              <li key={p.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <div>
                  <strong>{p.name}</strong> ({p.category}) | ₹{p.price}
                  {p.isVeg !== undefined && (
                    <span style={{ marginLeft: '8px', color: p.isVeg ? 'green' : 'red' }}>
                      {p.isVeg ? '● Veg' : '● Non-Veg'}
                    </span>
                  )}
                </div>
                {p.stock != null && <div>Stock: {p.stock}</div>}

                {/* Special Request Input for Food Items */}
                {selectedShop.role === 'RESTAURANT' && (
                  <div style={{ marginTop: '5px' }}>
                    <input
                      type="text"
                      placeholder="Special request (e.g. no onion)"
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      style={{ width: '200px', marginRight: '8px' }}
                    />
                  </div>
                )}

                <button
                  onClick={() => addToCart(p)}
                  style={{ marginTop: '4px' }}
                  disabled={!savedAddress}
                >
                  Add to cart
                </button>
              </li>
            ))}
            {shopProducts.length === 0 && (
              <p>No items available.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomerCommerce;
