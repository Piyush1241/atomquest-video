import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function JoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    axios.get(`/api/sessions/invite/${token}`)
      .then(({ data }) => { setInfo(data); setName(data.name || ''); })
      .catch(() => setError('This invite link is invalid or has expired.'));
  }, [token]);

  const join = () => {
    if (!name.trim()) return;
    // For customer: store a temporary token that includes sessionId
    // The server already validated the invite; we pass the original invite token as the socket auth
    localStorage.setItem('user', JSON.stringify({ name, role: 'customer', userId: 'customer-' + Date.now() }));
    localStorage.setItem('token', token); // invite token IS the socket auth token
    navigate(`/room/${info.sessionId}`);
  };

  if (error) return (
    <Center>
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>
      </div>
    </Center>
  );

  if (!info) return <Center><p>Validating invite...</p></Center>;

  return (
    <Center>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, width: 360 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Join Support Call</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Enter your name to join</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Your name"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
        />
        <button onClick={join} style={{ width: '100%', padding: 10, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Join Call
        </button>
      </div>
    </Center>
  );
}

const Center = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: 'sans-serif' }}>
    {children}
  </div>
);
