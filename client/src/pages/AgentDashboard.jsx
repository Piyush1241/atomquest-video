import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function AgentDashboard() {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setSessions(data));
  }, []);

  const createSession = async () => {
    setLoading(true);
    const { data } = await axios.post('/api/sessions', {}, { headers: { Authorization: `Bearer ${token}` } });
    setInviteUrl(data.inviteUrl);
    setSessions((prev) => [data.session, ...prev]);
    setLoading(false);
  };

  const joinRoom = (sessionId) => navigate(`/room/${sessionId}`);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Agent Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Welcome, {user.name}</p>
        </div>
        <button onClick={logout} style={btnStyle('#e5e7eb', '#111')}>Logout</button>
      </div>

      <button onClick={createSession} disabled={loading} style={{ ...btnStyle('#1d4ed8', '#fff'), marginBottom: 20, padding: '10px 24px', fontSize: 15 }}>
        {loading ? 'Creating...' : '+ New Session'}
      </button>

      {inviteUrl && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>Invite link ready — share with customer:</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={inviteUrl} readOnly style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }} />
            <button onClick={() => navigator.clipboard.writeText(inviteUrl)} style={btnStyle('#1d4ed8', '#fff')}>Copy</button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Your Sessions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((s) => (
          <div key={s.sessionId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <StatusBadge status={s.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.sessionId.slice(0, 8)}...</div>
              <div style={{ fontSize: 12, color: '#888' }}>{new Date(s.createdAt).toLocaleString()}</div>
            </div>
            {s.status !== 'ended' && (
              <button onClick={() => joinRoom(s.sessionId)} style={btnStyle('#1d4ed8', '#fff')}>Join</button>
            )}
          </div>
        ))}
        {sessions.length === 0 && <p style={{ color: '#888', fontSize: 14 }}>No sessions yet. Create one above.</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { waiting: '#f59e0b', active: '#4ade80', ended: '#9ca3af' };
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: colors[status] + '22', color: colors[status], fontWeight: 600 }}>
      {status}
    </span>
  );
}

const btnStyle = (bg, color) => ({
  padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: bg, color, fontSize: 13, fontWeight: 500,
});
