import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';

const AiAssistant = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hi, I am your SecondSons assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const nluUrl = 'http://localhost:8000/nlu';
  const nluContinueUrl = 'http://localhost:8000/nlu/continue';

  const [pendingNLU, setPendingNLU] = useState(null);
  // { intent, slots }

  const [housingContext, setHousingContext] = useState(null);
  /*
    housingContext shape:
    {
      stage: 'await_property_id' | 'await_booking_mode' | 'await_dates',
      location: string | null,
      propertyId?: string,
      propertyTitle?: string,
      propertyHostId?: string | null,
      propertyAddress?: string | null,
      bookingMode?: 'DAILY' | 'MONTHLY'
    }
  */

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  // ---------------- HOUSING HELPERS ----------------

  const handleHousingSearch = async (slots) => {
    const location = slots.location || null;

    const snap = await getDocs(collection(db, 'properties'));
    let allProps = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    allProps = allProps.filter((p) =>
      p.isActive === undefined ? true : p.isActive === true
    );

    let filtered = allProps;
    if (location) {
      const locLower = String(location).toLowerCase();
      filtered = allProps.filter((p) => {
        const addr = String(p.address || '').toLowerCase();
        const title = String(p.title || '').toLowerCase();
        return addr.includes(locLower) || title.includes(locLower);
      });
    }

    if (filtered.length === 0) {
      const msg = location
        ? `I could not find any properties around ${location}.`
        : 'I could not find any properties matching your request.';
      addMessage('assistant', msg);
      return msg;
    }

    addMessage(
      'assistant',
      `I found ${filtered.length} property(ies). Here are some options:`
    );

    filtered.slice(0, 5).forEach((p) => {
      const title = p.title || 'Untitled property';
      const addr = p.address || 'No address stored';
      const ppd =
        p.pricePerDay != null ? `₹${p.pricePerDay}/day` : undefined;
      const ppm =
        p.pricePerMonth != null ? `₹${p.pricePerMonth}/month` : undefined;
      const priceStr = [ppd, ppm].filter(Boolean).join(', ');
      addMessage(
        'assistant',
        `ID: ${p.id} | ${title} | ${addr}${priceStr ? ' | ' + priceStr : ''}`
      );
    });

    setHousingContext({
      stage: 'await_property_id',
      location,
    });

    return 'Please reply with the ID of the property you want to book (copy & paste one of the IDs above).';
  };

  const parseBookingMode = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('day') || lower.includes('night') || lower.includes('daily')) {
      return 'DAILY';
    }
    if (
      lower.includes('month') ||
      lower.includes('monthly') ||
      lower.includes('rental')
    ) {
      return 'MONTHLY';
    }
    return null;
  };

  const handleHousingFlow = async (text) => {
    const ctx = housingContext;
    if (!ctx) return;

    if (ctx.stage === 'await_property_id') {
      const propId = text.trim();
      if (!propId) {
        addMessage(
          'assistant',
          'Please send the property ID (copy & paste one of the IDs I listed).'
        );
        return;
      }

      const ref = doc(db, 'properties', propId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        addMessage(
          'assistant',
          'I could not find a property with that ID. Please make sure you copied it correctly.'
        );
        return;
      }

      const data = snap.data();
      const title = data.title || propId;
      const address = data.address || '';
      const hostId = data.hostId || null;

      setHousingContext({
        stage: 'await_booking_mode',
        location: ctx.location,
        propertyId: propId,
        propertyTitle: title,
        propertyHostId: hostId,
        propertyAddress: address,
      });

      addMessage(
        'assistant',
        `You selected "${title}". Do you want it on a daily basis or as a monthly rental?`
      );
      return;
    }

    if (ctx.stage === 'await_booking_mode') {
      const mode = parseBookingMode(text);
      if (!mode) {
        addMessage(
          'assistant',
          'Please say if you want to book it "daily" or "monthly".'
        );
        return;
      }

      setHousingContext({
        ...ctx,
        stage: 'await_dates',
        bookingMode: mode,
      });

      addMessage(
        'assistant',
        'Great. From which date would you like to start the stay? You can write like "from 2025-11-22" or "2025-11-22".'
      );
      return;
    }

    if (ctx.stage === 'await_dates') {
      try {
        const contRes = await fetch(nluContinueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            intent: 'book_housing',
            previous_slots: {
              location: ctx.location || ctx.propertyAddress || '',
              booking_mode: ctx.bookingMode,
            },
          }),
        });

        if (!contRes.ok) {
          throw new Error('Date parsing failed');
        }

        const contData = await contRes.json();
        const startIso = contData.slots.datetime_iso || null;
        const startText = contData.slots.datetime_text || text;

        const propId = ctx.propertyId;
        const ref = doc(db, 'properties', propId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          addMessage(
            'assistant',
            'The property seems to no longer exist. Please search again.'
          );
          setHousingContext(null);
          return;
        }
        const data = snap.data();
        const hostId = data.hostId || null;

        await addDoc(collection(db, 'bookings'), {
          propertyId: propId,
          hostId: hostId,
          customerId: user.uid,
          stayType: ctx.bookingMode === 'DAILY' ? 'DAY' : 'LONG_TERM',
          startDate: startIso || startText,
          endDate: null,
          status: 'pending',
          createdAt: serverTimestamp(),
        });

        addMessage(
          'assistant',
          `Okay, I have created a booking request for "${ctx.propertyTitle}" starting from ${startIso || startText}. You can see it in My Orders.`
        );
      } catch (err) {
        console.error(err);
        addMessage(
          'assistant',
          'I tried to book the property but something failed. Please try again.'
        );
      } finally {
        setHousingContext(null);
      }
    }
  };

  // ---------------- ACTION EXECUTION ----------------

  const executeAction = async (intent, slots, originalText) => {
    try {
      if (intent === 'order_grocery') {
        return await handleOrderGrocery(slots);
      }

      if (intent === 'book_cab') {
        return await handleBookCab(slots);
      }

      if (intent === 'health_symptom') {
        if (slots.datetime_iso) {
          const result = await handleDoctorConsult(
            slots,
            slots.symptom_text || originalText
          );
          return (
            'I detected health symptoms and used your preferred time to book a doctor: ' +
            result
          );
        }
        const symptom = slots.symptom_text || originalText;
        return (
          "I understand you're describing health symptoms: \"" +
          symptom +
          '". ' +
          'If you want me to book a doctor, please say something like "book a doctor for tomorrow 5pm".'
        );
      }

      if (intent === 'doctor_consult') {
        return await handleDoctorConsult(slots, originalText);
      }

      if (intent === 'housing_search' || intent === 'book_housing') {
        return await handleHousingSearch(slots);
      }

      if (intent === 'home_service') {
        return await handleHomeService(slots, originalText);
      }

      if (intent === 'smalltalk_or_other') {
        return 'Got it 🙂. If you want me to book a cab, house, service, or order groceries, just ask!';
      }

      return (
        `I detected intent "${intent}" with slots: ` +
        JSON.stringify(slots, null, 2)
      );
    } catch (err) {
      console.error(err);
      return 'I understood your intent but something failed while performing the action.';
    }
  };

  // -------------- ORDER GROCERY (with history + cheapest shop) --------------

  const handleOrderGrocery = async (slots) => {
    if (!profile.address) {
      return 'Please set your address in My Profile before ordering groceries.';
    }

    const productName = slots.product_name;
    const productCategory = slots.product_category;
    const quantityValue = slots.quantity_value || 1;

    if (!productName && !productCategory) {
      return 'I know you want groceries but I am not sure which item. Please specify the product.';
    }

    const productsSnap = await getDocs(collection(db, 'products'));
    const allProducts = productsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const findCheapest = (items) => {
      if (items.length === 0) return null;
      return items.reduce((best, cur) => {
        const bestPrice =
          typeof best.price === 'number' ? best.price : Infinity;
        const curPrice =
          typeof cur.price === 'number' ? cur.price : Infinity;
        return curPrice < bestPrice ? cur : best;
      }, items[0]);
    };

    let candidates = [];

    if (productName) {
      const nameLower = productName.toLowerCase();
      candidates = allProducts.filter((p) => {
        const n = String(p.name || '').toLowerCase();
        return n.includes(nameLower);
      });
    }

    if (candidates.length === 0 && productCategory) {
      const catLower = productCategory.toLowerCase();
      candidates = allProducts.filter((p) => {
        const n = String(p.name || '').toLowerCase();
        const c = String(p.category || '').toLowerCase();
        return n.includes(catLower) || c.includes(catLower);
      });

      if (candidates.length > 0 && !productName) {
        const ordersSnap = await getDocs(
          query(
            collection(db, 'commerceOrders'),
            where('customerId', '==', user.uid)
          )
        );
        const orders = ordersSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const candidateIds = new Set(candidates.map((c) => c.id));
        const counts = {};
        for (const o of orders) {
          if (o.productId && candidateIds.has(o.productId)) {
            counts[o.productId] = (counts[o.productId] || 0) + 1;
          }
        }

        let bestId = null;
        let bestCount = 0;
        for (const [pid, count] of Object.entries(counts)) {
          if (count > bestCount) {
            bestCount = count;
            bestId = pid;
          }
        }

        if (bestId) {
          const prod = candidates.find((c) => c.id === bestId);
          if (prod) {
            const qty = quantityValue;
            await addDoc(collection(db, 'commerceOrders'), {
              customerId: user.uid,
              shopId: prod.shopId,
              productId: prod.id,
              quantity: qty,
              status: 'pending',
              deliveryPartnerId: null,
              address: profile.address,
              createdAt: serverTimestamp(),
            });
            return `I reordered your usual ${prod.name} (${qty} unit(s)) from the shop with the current price ₹${prod.price}.`;
          }
        }
      }
    }

    if (candidates.length === 0 && !productCategory && productName) {
      const nameLower = productName.toLowerCase();
      candidates = allProducts.filter((p) => {
        const n = String(p.name || '').toLowerCase();
        return n.includes(nameLower);
      });
    }

    if (candidates.length === 0) {
      return 'I could not find a matching product for your request in the catalogue.';
    }

    const bestProduct = findCheapest(candidates);
    if (!bestProduct) {
      return 'I could not choose a product to order.';
    }

    const qty = quantityValue;
    await addDoc(collection(db, 'commerceOrders'), {
      customerId: user.uid,
      shopId: bestProduct.shopId,
      productId: bestProduct.id,
      quantity: qty,
      status: 'pending',
      deliveryPartnerId: null,
      address: profile.address,
      createdAt: serverTimestamp(),
    });

    return `Okay, I will order ${qty} unit(s) of "${bestProduct.name}" from the cheapest shop (₹${bestProduct.price}). You can track it in My Orders.`;
  };

  // ------------------ CAB BOOKING ------------------

  const handleBookCab = async (slots) => {
    const origin = slots.origin;
    const destination = slots.destination;
    const datetimeIso = slots.datetime_iso;

    if (!origin || !destination) {
      return 'I detected a cab request but I need both pickup and drop locations (e.g. "from X to Y").';
    }

    const scheduledTime = datetimeIso || null;

    await addDoc(collection(db, 'cabRequests'), {
      customerId: user.uid,
      pickupLocation: origin,
      dropLocation: destination,
      scheduledTime: scheduledTime,
      notes: '',
      status: 'pending',
      driverId: null,
      createdAt: serverTimestamp(),
    });

    if (scheduledTime) {
      return `Got it. I have created a cab request from "${origin}" to "${destination}" at ${scheduledTime}. You can see it under My Orders.`;
    }
    return `Got it. I have created a cab request from "${origin}" to "${destination}". Since you did not specify time clearly, it is marked as unscheduled.`;
  };

  // ------------------ DOCTOR CONSULT ------------------

  const handleDoctorConsult = async (slots, originalText) => {
    const datetimeIso = slots.datetime_iso;
    const symptoms = slots.symptom_text || originalText;

    await addDoc(collection(db, 'medicalConsultations'), {
      customerId: user.uid,
      doctorId: null,
      symptoms: symptoms,
      preferredTime: datetimeIso || null,
      status: 'pending',
      notes: '',
      prescription: '',
      createdAt: serverTimestamp(),
    });

    if (datetimeIso) {
      return `Okay, I have created a doctor consultation request for ${datetimeIso}. You can see it in My Orders.`;
    }
    return 'Okay, I have created a doctor consultation request. Since the time was not clear, it is stored without a specific time. You can update it later.';
  };

  // ------------------ HOME SERVICE BOOKING ------------------

  const handleHomeService = async (slots, originalText) => {
    if (!profile.address) {
      return 'Please set your address in My Profile before booking a worker.';
    }

    const serviceCategory = slots.service_category || 'Other';
    const datetimeIso = slots.datetime_iso || null;

    await addDoc(collection(db, 'serviceRequests'), {
      customerId: user.uid,
      category: serviceCategory,
      description: originalText,
      address: profile.address,
      scheduledTime: datetimeIso,
      status: 'pending', // pending, quoted, accepted, completed, cancelled
      workerId: null,
      proposedPrice: null,
      proposedByWorkerId: null,
      createdAt: serverTimestamp(),
    });

    let msg = `Okay, I have created a ${serviceCategory} service request`;
    if (datetimeIso) {
      msg += ` for ${datetimeIso}`;
    }
    msg +=
      '. A worker from this category will see it on their dashboard. You can see it in My Orders / Services.';
    return msg;
  };

  // ------------------ SEND HANDLER ------------------

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput('');
    addMessage('user', text);

    if (!user || !profile) {
      addMessage(
        'assistant',
        'Please log in first so I can access your profile and place orders.'
      );
      return;
    }

    setLoading(true);
    try {
      // 1) Housing multi-turn flow
      if (housingContext) {
        await handleHousingFlow(text);
        return;
      }

      // 2) Continue filling slots for a known intent
      if (pendingNLU) {
        const contRes = await fetch(nluContinueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            intent: pendingNLU.intent,
            previous_slots: pendingNLU.slots,
          }),
        });

        if (!contRes.ok) {
          throw new Error('NLU continue server error');
        }

        const data = await contRes.json();
        const {
          intent,
          slots,
          missing_slots: missingSlots,
          followup_question: followupQuestion,
        } = data;

        if (missingSlots && missingSlots.length > 0 && followupQuestion) {
          setPendingNLU({ intent, slots });
          addMessage(
            'assistant',
            followupQuestion + ` (I detected intent: ${intent})`
          );
        } else {
          setPendingNLU(null);
          const actionReply = await executeAction(intent, slots, text);
          addMessage('assistant', actionReply);
        }

        return;
      }

      // 3) Fresh message -> classify fully
      const res = await fetch(nluUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error('NLU server error');
      }

      const data = await res.json();
      const {
        intent,
        slots,
        missing_slots: missingSlots,
        followup_question: followupQuestion,
      } = data;

      if (missingSlots && missingSlots.length > 0 && followupQuestion) {
        setPendingNLU({ intent, slots });
        addMessage(
          'assistant',
          followupQuestion + ` (I detected intent: ${intent})`
        );
      } else {
        const actionReply = await executeAction(intent, slots, text);
        addMessage('assistant', actionReply);
      }
    } catch (err) {
      console.error(err);
      addMessage(
        'assistant',
        'Sorry, something went wrong talking to the AI server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>AI Assistant</h1>
      <p>
        Chat with this assistant to order groceries, book a cab, search and book
        housing, book home services, or request a doctor consultation.
      </p>

      <div
        style={{
          border: '1px solid #ccc',
          padding: '8px',
          height: '400px',
          overflowY: 'auto',
          marginBottom: '8px',
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '6px',
              textAlign: m.sender === 'user' ? 'right' : 'left',
            }}
          >
            <strong>{m.sender === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
            <span>{m.text}</span>
          </div>
        ))}
        {loading && <div>Assistant is thinking...</div>}
      </div>

      <form
        onSubmit={handleSend}
        style={{ display: 'flex', gap: '8px', maxWidth: '600px' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message (e.g. 'order fanta', 'fan not working', 'tap is leaking')"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default AiAssistant;
