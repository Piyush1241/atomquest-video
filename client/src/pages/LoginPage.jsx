import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const submit = async () => {
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const { data } = await axios.post(url, form);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  const field = (key, placeholder, type = 'text') => (
    <input
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      placeholder={placeholder}
      type={type}
      style={inputStyle}
    />
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 360 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>AtomQuest Video</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>{mode === 'login' ? 'Sign in to your account' : 'Create an agent account'}</p>

        {mode === 'register' && field('name', 'Full name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Password', 'password')}

        {mode === 'register' && (
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button onClick={submit} style={{ width: '100%', padding: 10, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
          {mode === 'login' ? 'Sign In' : 'Register'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#666' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{ color: '#1d4ed8', cursor: 'pointer', fontWeight: 500 }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </span>
        </p>

        <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
          <strong>Demo credentials:</strong><br />
          agent@demo.com / demo123<br />
          admin@demo.com / demo123
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', display: 'block' };
