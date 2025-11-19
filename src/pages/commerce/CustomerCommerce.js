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
  const { user, profile, loading } = useAuth();
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);

  // Cart: [{ productId, quantity }]
  const [cartItems, setCartItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // All shops (users with role SHOP)
    const qShops = query(
      collection(db, 'users'),
      where('role', '==', 'SHOP')
    );
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const resetCartForNewShop = (shop) => {
    setSelectedShop(shop);
    setCartItems([]); // cart is per-shop
    setError('');
  };

  const addToCart = (product) => {
    if (!selectedShop || product.shopId !== selectedShop.id) {
      // Safety: only allow items from the currently selected shop
      resetCartForNewShop(
        shops.find((s) => s.id === product.shopId) || null
      );
    }

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });

    setError('');
  };

  const updateCartQuantity = (productId, newQty) => {
    const value = parseInt(newQty, 10);
    if (Number.isNaN(value) || value <= 0) {
      // Remove if non-positive
      setCartItems((prev) =>
        prev.filter((item) => item.productId !== productId)
      );
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: value }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) =>
      prev.filter((item) => item.productId !== productId)
    );
  };

  const placeOrderFromCart = async () => {
    setError('');

    if (!selectedShop) {
      setError('Please select a shop first.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!savedAddress) {
      setError(
        'Please set your address in My Profile before placing an order.'
      );
      return;
    }

    try {
      // Create one commerceOrders document per cart item
      for (const item of cartItems) {
        await addDoc(collection(db, 'commerceOrders'), {
          customerId: user.uid,
          shopId: selectedShop.id,
          productId: item.productId,
          quantity: item.quantity,
          status: 'pending', // pending, accepted, rejected, ready_for_delivery, out_for_delivery, delivered
          deliveryPartnerId: null,
          address: savedAddress,
          createdAt: serverTimestamp(),
        });
      }

      setCartItems([]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to place order');
    }
  };

  return (
    <div>
      <h1>Quick Commerce (Customer)</h1>
      <p>
        Your order history is available in the "My Orders" page.
      </p>

      <p>
        <strong>Using your saved address:</strong>{' '}
        {savedAddress
          ? savedAddress
          : 'No address set. Go to "My Profile" and set your address.'}
      </p>

      {/* Shops list */}
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
              onClick={() => resetCartForNewShop(s)}
              style={{ marginTop: '4px' }}
            >
              View products
            </button>
          </li>
        ))}
        {shops.length === 0 && <p>No shops found.</p>}
      </ul>

      {/* Products of selected shop */}
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
                  onClick={() => addToCart(p)}
                  style={{ marginTop: '4px' }}
                >
                  Add to cart
                </button>
              </li>
            ))}
            {shopProducts.length === 0 && (
              <p>No products for this shop.</p>
            )}
          </ul>
        </div>
      )}

      {/* Cart */}
      <div style={{ marginTop: '24px' }}>
        <h2>Your cart</h2>
        {cartItems.length === 0 && <p>Cart is empty.</p>}
        {cartItems.length > 0 && (
          <ul>
            {cartItems.map((item) => {
              const product = products.find(
                (p) => p.id === item.productId
              );
              return (
                <li
                  key={item.productId}
                  style={{
                    marginBottom: '6px',
                    padding: '4px',
                    border: '1px solid #ccc',
                  }}
                >
                  <div>
                    {product ? product.name : item.productId}
                  </div>
                  <label>
                    Quantity:{' '}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateCartQuantity(
                          item.productId,
                          e.target.value
                        )
                      }
                      style={{ width: '60px' }}
                    />
                  </label>
                  <button
                    onClick={() =>
                      removeFromCart(item.productId)
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          onClick={placeOrderFromCart}
          disabled={
            cartItems.length === 0 || !savedAddress || !selectedShop
          }
        >
          Place order from cart
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>
        )}
      </div>
    </div>
  );
};

export default CustomerCommerce;
