const mediasoup = require('mediasoup');

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
];

let worker;
const rooms = new Map(); // sessionId -> { router, peers: Map }

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 10000,
    rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 10100,
  });
  worker.on('died', () => {
    console.error('mediasoup worker died, restarting...');
    setTimeout(createWorker, 2000);
  });
  console.log('mediasoup worker created');
  return worker;
}

async function getOrCreateRoom(sessionId) {
  if (rooms.has(sessionId)) return rooms.get(sessionId);
  const router = await worker.createRouter({ mediaCodecs });
  const room = { router, peers: new Map() };
  rooms.set(sessionId, room);
  return room;
}

function getRoom(sessionId) {
  return rooms.get(sessionId);
}

function removeRoom(sessionId) {
  const room = rooms.get(sessionId);
  if (room) {
    room.router.close();
    rooms.delete(sessionId);
  }
}

function getRtpCapabilities(sessionId) {
  const room = rooms.get(sessionId);
  return room?.router.rtpCapabilities;
}

module.exports = { createWorker, getOrCreateRoom, getRoom, removeRoom, getRtpCapabilities };
