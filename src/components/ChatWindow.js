import React, { useEffect, useState, useRef } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const ChatWindow = ({ requestId, currentUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!requestId) return;

        const q = query(
            collection(db, 'chats', requestId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [requestId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        await addDoc(collection(db, 'chats', requestId, 'messages'), {
            text: newMessage,
            senderId: currentUser.uid,
            createdAt: serverTimestamp(),
        });

        setNewMessage('');
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '300px',
                height: '400px',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    padding: '10px',
                    borderBottom: '1px solid #ccc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                }}
            >
                <strong>Chat</strong>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                    }}
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                        <div
                            key={msg.id}
                            style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                backgroundColor: isMe ? '#007bff' : '#e9ecef',
                                color: isMe ? 'white' : 'black',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                maxWidth: '80%',
                                wordWrap: 'break-word',
                            }}
                        >
                            {msg.text}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form
                onSubmit={handleSendMessage}
                style={{
                    padding: '10px',
                    borderTop: '1px solid #ccc',
                    display: 'flex',
                    gap: '8px',
                }}
            >
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '6px' }}
                />
                <button type="submit" style={{ padding: '6px 12px' }}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
