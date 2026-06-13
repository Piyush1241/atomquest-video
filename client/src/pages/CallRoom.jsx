import { useParams } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import { useMediasoup } from '../hooks/useMediasoup';
import ChatPanel from '../components/ChatPanel';
import NetworkBadge from '../components/NetworkBadge';
import api from '../api';

export default function CallRoom() {
  const { sessionId } = useParams();
  const { token, user } = useAuthStore();
  const localVideoRef = useRef(null);
  const [showChat, setShowChat] = useState(true);

  // Build a socket token scoped to this session
  const sessionToken = token; // server will read sessionId from the JWT's sessionId field OR user's JWT for agents

  const {
    connected, localStream, remoteStreams, participants,
    chatMessages, recordingStatus, networkQuality,
    isMuted, isVideoOff, toggleMute, toggleVideo,
    sendChat, startRecording, stopRecording,
  } = useMediasoup({ sessionId, token });

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const endCall = async () => {
    if (user.role === 'agent') {
      await api.post(`/api/sessions/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    window.location.href = '/';
  };

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Main call area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
          <span style={{ fontWeight: 600 }}>AtomQuest Support</span>
          <span style={{ fontSize: 12, color: connected ? '#4ade80' : '#f87171' }}>
            {connected ? '● Live' : '○ Connecting...'}
          </span>
          {recordingStatus === 'recording' && (
            <span style={{ fontSize: 12, color: '#f87171', animation: 'pulse 1s infinite' }}>
              ● REC
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <NetworkBadge quality={networkQuality} />
          </div>
        </div>

        {/* Video grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: remoteEntries.length > 0 ? '1fr 1fr' : '1fr', gap: 8, padding: 12, alignContent: 'start' }}>

          {/* Local video */}
          <VideoTile label={`${user.name} (You)`} muted>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            {isVideoOff && <div style={offOverlay}>Camera off</div>}
          </VideoTile>

          {/* Remote videos */}
          {remoteEntries.map(([uid, stream]) => {
            const p = participants.find((x) => x.userId === uid);
            return (
              <VideoTile key={uid} label={p?.name || 'Participant'}>
                <RemoteVideo stream={stream} />
              </VideoTile>
            );
          })}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 0', background: '#1a1a1a', borderTop: '1px solid #333' }}>
          <ControlBtn onClick={toggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} />
          <ControlBtn onClick={toggleVideo} active={isVideoOff} label={isVideoOff ? 'Start Video' : 'Stop Video'} />
          <ControlBtn onClick={() => setShowChat(!showChat)} label="Chat" />

          {(user.role === 'agent' || user.role === 'admin') && (
            <>
              {recordingStatus === 'idle' && <ControlBtn onClick={startRecording} label="Record" color="#ef4444" />}
              {recordingStatus === 'recording' && <ControlBtn onClick={stopRecording} label="Stop Rec" color="#ef4444" />}
              {recordingStatus === 'processing' && <ControlBtn label="Processing..." disabled />}
              {recordingStatus === 'ready' && <ControlBtn label="Download" color="#4ade80" />}
            </>
          )}

          <ControlBtn onClick={endCall} label="End Call" color="#ef4444" />
        </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <div style={{ width: 320, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <ChatPanel messages={chatMessages} onSend={sendChat} user={user} token={token} />
        </div>
      )}
    </div>
  );
}

function VideoTile({ label, children, muted }) {
  return (
    <div style={{ position: 'relative', background: '#1e1e1e', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9' }}>
      {children}
      <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

function RemoteVideo({ stream }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />;
}

function ControlBtn({ onClick, label, active, color, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 6, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: active ? '#374151' : (color || '#374151'), color: color ? '#fff' : (active ? '#f87171' : '#fff'),
      fontSize: 13, fontWeight: 500, opacity: disabled ? 0.5 : 1,
    }}>
      {label}
    </button>
  );
}

const offOverlay = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#111', color: '#aaa', fontSize: 14,
};
