# AtomQuest Video Support Platform

Real-time video calling platform for customer support. Built with mediasoup SFU (no P2P, no third-party video APIs), React, Node.js, MongoDB, and Redis.

## Features

- ✅ Server-side media routing via mediasoup SFU
- ✅ Session management (create, join, end, history)
- ✅ Real-time in-call chat with file sharing
- ✅ Two roles: Agent and Customer (invite-link only)
- ✅ Call recording (start/stop with status indicator)
- ✅ Reconnect grace window (15s)
- ✅ Admin dashboard (live sessions, force-end, history)
- ✅ Prometheus metrics endpoint (/metrics)
- ✅ Network quality indicator (WebRTC getStats)

## Setup

### 1. Clone and install
```bash
git clone <repo>
cd atomquest-video
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure server
```bash
cd server
cp .env.example .env
# Fill in: MONGODB_URI, REDIS_URL, JWT_SECRET, MEDIASOUP_ANNOUNCED_IP
```

### 3. Seed demo accounts
```bash
cd server
node seed.js
```

### 4. Run locally
```bash
cd ..  # back to root
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Metrics: http://localhost:4000/metrics

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Agent | agent@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

## How to demo end-to-end

1. Login as **agent@demo.com**
2. Click **New Session** → copy the invite URL
3. Open invite URL in a second browser/incognito tab
4. Enter customer name → Join Call
5. Both participants see each other via server-routed video
6. Test: mute, video off, chat, file share, recording

## Deployment

**Backend** → Railway  
Set env vars: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `MEDIASOUP_ANNOUNCED_IP` (Railway's public IP), `CLIENT_URL`

**Frontend** → Vercel  
Set: `VITE_SERVER_URL=https://your-railway-url.railway.app`

> ⚠️ mediasoup requires UDP ports. On Railway, set `MEDIASOUP_MIN_PORT=10000`, `MEDIASOUP_MAX_PORT=10100` and ensure those ports are open.

## Architecture

See `architecture.pdf` in the repo root.

## Known Limitations

- Recording uses a placeholder pipeline; full FFmpeg RTP mux requires the server's media streams to be piped explicitly per producer
- File uploads stored locally; use S3 for production persistence
- mediasoup announced IP must match the Railway server's public IP exactly
