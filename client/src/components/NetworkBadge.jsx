export default function NetworkBadge({ quality }) {
  const bars = [1, 2, 3];
  const colors = { 1: '#ef4444', 2: '#f59e0b', 3: '#4ade80' };

  return (
    <div title={`Network quality: ${quality}/3`} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, cursor: 'default' }}>
      {bars.map((b) => (
        <div key={b} style={{
          width: 4,
          height: 6 + b * 4,
          borderRadius: 1,
          background: b <= quality ? colors[quality] : '#444',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}
