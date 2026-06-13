const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createWorker, getOrCreateRoom, getRoom, removeRoom } = require('./media/worker');
const Session = require('./models/Session');
const { metrics } = require('./routes/metrics');

const RECONNECT_GRACE_MS = 15000;
const reconnectTimers = new Map();

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function safeCb(cb) {
  return typeof cb === 'function' ? cb : () => {};
}

async function initSocket(server) {
  await createWorker();

  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const user = verifyToken(token);
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const { userId, name, role, sessionId } = socket.user;
    console.log(`[socket] connected: ${name} (${role}) session=${sessionId}`);

    const reconnectKey = `${sessionId}:${userId}`;
    if (reconnectTimers.has(reconnectKey)) {
      clearTimeout(reconnectTimers.get(reconnectKey));
      reconnectTimers.delete(reconnectKey);
      console.log(`[reconnect] ${name} rejoined within grace window`);
    }

    socket.join(sessionId);
    if (role === 'admin') socket.join('admin');

    socket.on('getRouterRtpCapabilities', async (data, cb) => {
      if (typeof data === 'function') cb = data;
      cb = safeCb(cb);
      try {
        const room = await getOrCreateRoom(sessionId);
        cb(room.router.rtpCapabilities);
      } catch (err) {
        cb({ error: err.message });
      }
    });

    socket.on('createTransport', async (data, cb) => {
      if (typeof data === 'function') { cb = data; data = {}; }
      cb = safeCb(cb);
      try {
        const { direction } = data;
        const room = await getOrCreateRoom(sessionId);
        const transport = await room.router.createWebRtcTransport({
          listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1' }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        });

        if (!room.peers.has(userId)) {
          room.peers.set(userId, { name, role, transports: {}, producers: [], consumers: [] });
        }
        room.peers.get(userId).transports[direction] = transport;

        cb({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err) {
        cb({ error: err.message });
      }
    });

    socket.on('connectTransport', async (data, cb) => {
      if (typeof data === 'function') { cb = data; data = {}; }
      cb = safeCb(cb);
      try {
        const { direction, dtlsParameters } = data;
        const room = getRoom(sessionId);
        const peer = room?.peers.get(userId);
        await peer?.transports[direction]?.connect({ dtlsParameters });
        cb({});
      } catch (err) {
        cb({ error: err.message });
      }
    });

    socket.on('produce', async (data, cb) => {
      if (typeof data === 'function') { cb = data; data = {}; }
      cb = safeCb(cb);
      try {
        const { kind, rtpParameters, appData } = data;
        const room = getRoom(sessionId);
        const peer = room?.peers.get(userId);
        const transport = peer?.transports['send'];
        const producer = await transport.produce({ kind, rtpParameters, appData });
        peer.producers.push(producer);

        socket.to(sessionId).emit('newProducer', {
          producerId: producer.id,
          userId,
          name,
          kind,
        });

        cb({ id: producer.id });
      } catch (err) {
        cb({ error: err.message });
      }
    });

    socket.on('consume', async (data, cb) => {
      if (typeof data === 'function') { cb = data; data = {}; }
      cb = safeCb(cb);
      try {
        const { producerId, rtpCapabilities } = data;
        const room = getRoom(sessionId);
        if (!room?.router.canConsume({ producerId, rtpCapabilities })) {
          return cb({ error: 'Cannot consume' });
        }
        const peer = room.peers.get(userId);
        const transport = peer?.transports['recv'];
        const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false });
        peer.consumers.push(consumer);

        cb({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (err) {
        cb({ error: err.message });
      }
    });

    socket.on('getProducers', (data, cb) => {
      if (typeof data === 'function') cb = data;
      cb = safeCb(cb);
      const room = getRoom(sessionId);
      if (!room) return cb([]);
      const producers = [];
      room.peers.forEach((peer, peerId) => {
        if (peerId !== userId) {
          peer.producers.forEach((p) => {
            producers.push({ producerId: p.id, userId: peerId, name: peer.name, kind: p.kind });
          });
        }
      });
      cb(producers);
    });

    socket.on('chatMessage', async ({ message, fileUrl, fileName, type }) => {
      const msg = { userId, name, message, fileUrl, fileName, type: type || 'text', timestamp: new Date() };
      io.to(sessionId).emit('chatMessage', msg);
      await Session.findOneAndUpdate({ sessionId }, { $push: { chat: msg } });
    });

    socket.on('startRecording', async (data, cb) => {
      if (typeof data === 'function') cb = data;
      cb = safeCb(cb);
      if (role !== 'agent' && role !== 'admin') return cb({ error: 'Agent only' });
      await Session.findOneAndUpdate({ sessionId }, { recordingStatus: 'recording' });
      io.to(sessionId).emit('recordingStatus', { status: 'recording' });
      cb({ ok: true });
    });

    socket.on('stopRecording', async (data, cb) => {
      if (typeof data === 'function') cb = data;
      cb = safeCb(cb);
      if (role !== 'agent' && role !== 'admin') return cb({ error: 'Agent only' });
      await Session.findOneAndUpdate({ sessionId }, { recordingStatus: 'processing' });
      io.to(sessionId).emit('recordingStatus', { status: 'processing' });
      setTimeout(async () => {
        await Session.findOneAndUpdate({ sessionId }, { recordingStatus: 'ready', recordingUrl: '/recordings/placeholder.mp4' });
        io.to(sessionId).emit('recordingStatus', { status: 'ready', url: '/recordings/placeholder.mp4' });
      }, 3000);
      cb({ ok: true });
    });

    socket.on('adminGetSessions', async (data, cb) => {
      if (typeof data === 'function') cb = data;
      cb = safeCb(cb);
      if (role !== 'admin') return cb({ error: 'Admin only' });
      const sessions = await Session.find({ status: { $ne: 'ended' } }).sort({ createdAt: -1 });
      cb(sessions);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${name} (${role})`);
      const reconnectKey = `${sessionId}:${userId}`;
      const timer = setTimeout(async () => {
        reconnectTimers.delete(reconnectKey);
        const room = getRoom(sessionId);
        if (room) {
          const peer = room.peers.get(userId);
          if (peer) {
            peer.producers.forEach((p) => p.close());
            peer.consumers.forEach((c) => c.close());
            Object.values(peer.transports).forEach((t) => t.close());
            room.peers.delete(userId);
          }
          if (room.peers.size === 0) {
            await Session.findOneAndUpdate({ sessionId }, { status: 'ended', endedAt: new Date() });
            removeRoom(sessionId);
          }
        }
        io.to(sessionId).emit('participantLeft', { userId, name });
        io.to('admin').emit('sessionUpdate', { sessionId, event: 'participantLeft', userId });
      }, RECONNECT_GRACE_MS);

      reconnectTimers.set(reconnectKey, timer);
    });

    socket.to(sessionId).emit('participantJoined', { userId, name, role });
    io.to('admin').emit('sessionUpdate', { sessionId, event: 'participantJoined', userId, name, role });
  });
}

module.exports = { initSocket };
