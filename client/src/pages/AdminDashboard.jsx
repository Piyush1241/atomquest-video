import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function AdminDashboard() {
  const { token, logout } = useAuthStore();
  const [sessions, setSessions] = useState([]);

  const fetchSessions = () =>
    axios.get('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setSessions(data));

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  const forceEnd = async (sessionId) => {
    await axios.post(`/api/sessions/${sessionId}/force-end`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchSessions();
  };

  const active = sessions.filter((s) => s.status !== 'ended');
  const ended = sessions.filter((s) => s.status === 'ended');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Admin Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Live session monitoring</p>
        </div>
        <button onClick={logout} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Logout</button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
        <MetricCard label="Live sessions" value={active.length} color="#4ade80" />
        <MetricCard label="Total sessions" value={sessions.length} color="#60a5fa" />
        <MetricCard label="Ended today" value={ended.length} color="#9ca3af" />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Active Sessions</h2>
      {active.length === 0 && <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>No active sessions</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {active.map((s) => (
          <div key={s.sessionId} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Agent: {s.agentName}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {s.participants?.length || 0} participant(s) · Created {new Date(s.createdAt).toLocaleTimeString()}
              </div>
            </div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>{s.status}</span>
            <button onClick={() => forceEnd(s.sessionId)} style={{ padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
              Force End
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Session History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ended.slice(0, 10).map((s) => (
          <div key={s.sessionId} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', border: '1px solid #f3f4f6', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ flex: 1, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{s.agentName}</span>
              <span style={{ color: '#888' }}> · {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString()}</span>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>ended</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 18px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}
