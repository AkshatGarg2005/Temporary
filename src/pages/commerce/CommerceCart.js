import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

const CommerceCart = () => {
  const { user, profile, loading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    // Cart items for this user
    const qCart = query(
      collection(db, 'cartItems'),
      where('userId', '==', user.uid)
    );
    const unsubCart = onSnapshot(qCart, (snapshot) => {
      setCartItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // All products (used to show names/prices)
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubCart();
      unsubProducts();
    };
  }, [user]);

  useEffect(() => {
    const loadShops = async () => {
      const shopIds = Array.from(
        new Set(cartItems.map((c) => c.shopId).filter(Boolean))
      );
      const map = {};
      for (const id of shopIds) {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          if (snap.exists()) {
            map[id] = snap.data();
          }
        } catch (err) {
          console.error('Failed to fetch shop profile', err);
        }
      }
      setShops(map);
    };

    if (cartItems.length > 0) {
      loadShops();
    } else {
      setShops({});
    }
  }, [cartItems]);

  if (loading || !profile) {
    return <div>Loading...</div>;
  }

  const savedAddress = profile.address || '';

  const updateQuantity = async (item, newValue) => {
    const qty = parseInt(newValue, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      // treat <=0 as remove
      await deleteDoc(doc(db, 'cartItems', item.id));
      return;
    }
    await updateDoc(doc(db, 'cartItems', item.id), {
      quantity: qty,
    });
  };

  const removeItem = async (item) => {
    await deleteDoc(doc(db, 'cartItems', item.id));
  };

  const placeOrder = async () => {
    setError('');
    setMessage('');

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!savedAddress) {
      setError('Please set your address in My Profile before placing an order.');
      return;
    }

    try {
      // One commerceOrders document per cart item
      for (const item of cartItems) {
        await addDoc(collection(db, 'commerceOrders'), {
          customerId: user.uid,
          shopId: item.shopId,
          productId: item.productId,
          quantity: item.quantity,
          specialRequest: item.specialRequest || null,
          status: 'pending', // pending, accepted, rejected, ready_for_delivery, out_for_delivery, delivered
          deliveryPartnerId: null,
          address: savedAddress,
          createdAt: serverTimestamp(),
        });

        // Clear cart item
        await deleteDoc(doc(db, 'cartItems', item.id));
      }

      setMessage('Order placed successfully. You can track it in "My Orders".');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to place order');
    }
  };

  const getItemTotal = (item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product || typeof product.price !== 'number') return 0;
    return product.price * (item.quantity || 1);
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + getItemTotal(item),
    0
  );

  return (
    <div>
      <h1>Quick Commerce Cart</h1>
      <p>
        Orders placed here will appear in your <strong>"My Orders"</strong> page.
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

      <h2>Items in your cart</h2>
      {cartItems.length === 0 && <p>Cart is empty.</p>}
      {cartItems.length > 0 && (
        <ul>
          {cartItems.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const shop = shops[item.shopId];
            const lineTotal = getItemTotal(item);

            return (
              <li
                key={item.id}
                style={{
                  marginBottom: '8px',
                  padding: '6px',
                  border: '1px solid #ccc',
                }}
              >
                <div>
                  <strong>
                    {product ? product.name : item.productId}
                  </strong>{' '}
                  {product?.price != null &&
                    `| ₹${product.price} each`}
                  {item.specialRequest && (
                    <div style={{ color: 'red', fontSize: '0.9em' }}>
                      Note: {item.specialRequest}
                    </div>
                  )}
                </div>
                <div>
                  Shop/Restaurant:{' '}
                  {shop ? shop.name : item.shopId}
                  {shop?.address && ` | Address: ${shop.address}`}
                  {shop?.phone && ` | Phone: ${shop.phone}`}
                </div>
                <div>
                  Quantity:{' '}
                  <input
                    type="number"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) =>
                      updateQuantity(item, e.target.value)
                    }
                    style={{ width: '60px' }}
                  />
                  <button
                    onClick={() => removeItem(item)}
                    style={{ marginLeft: '8px' }}
                  >
                    Remove
                  </button>
                </div>
                <div>
                  Line total: ₹{lineTotal.toFixed(2)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cartItems.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p>
            <strong>Cart total:</strong> ₹{cartTotal.toFixed(2)}
          </p>
          <button
            onClick={placeOrder}
            disabled={!savedAddress || cartItems.length === 0}
          >
            Place order
          </button>
        </div>
      )}
    </div>
  );
};

export default CommerceCart;
