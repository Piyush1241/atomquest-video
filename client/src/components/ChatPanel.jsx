import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function ChatPanel({ messages, onSend, user, token }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text, null, null, 'text');
    setText('');
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post('/api/upload', form, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    onSend('', data.fileUrl, data.fileName, 'file');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #333', fontWeight: 600, fontSize: 14 }}>Chat</div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.userId === user.userId ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{m.name}</div>
            {m.type === 'file' ? (
              <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{
                display: 'block', padding: '8px 12px', background: '#1e3a5f', borderRadius: 6, fontSize: 13, color: '#60a5fa',
              }}>
                📎 {m.fileName}
              </a>
            ) : (
              <div style={{ padding: '8px 12px', background: m.userId === user.userId ? '#1d4ed8' : '#1e1e1e', borderRadius: 6, fontSize: 13 }}>
                {m.message}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 10, borderTop: '1px solid #333', display: 'flex', gap: 6 }}>
        <label style={{ cursor: 'pointer', padding: '6px 10px', background: '#1e1e1e', borderRadius: 6, fontSize: 18 }}>
          📎<input type="file" hidden onChange={handleFile} />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message..."
          style={{ flex: 1, background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 13 }}
        />
        <button onClick={send} style={{ padding: '6px 14px', background: '#1d4ed8', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13 }}>
          Send
        </button>
      </div>
    </div>
  );
}
