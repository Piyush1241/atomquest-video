import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export function useMediasoup({ sessionId, token }) {
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingProducers = useRef([]);
  const recvReady = useRef(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [networkQuality, setNetworkQuality] = useState(3);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const emit = (event, data) =>
    new Promise((res) => socketRef.current?.emit(event, data, res));

  const consumeProducer = useCallback(async ({ producerId, userId, name, kind }) => {
    console.log('consumeProducer called', { producerId, userId, kind });
    const rtpCapabilities = deviceRef.current?.rtpCapabilities;
    const params = await emit('consume', { producerId, rtpCapabilities });
    console.log('consume params', params);
    if (!params || params.error) {
      console.error('consume error', params?.error);
      return;
    }
    const consumer = await recvTransportRef.current.consume(params);
    console.log('consumer created', consumer.track);

    setRemoteStreams((prev) => {
      const stream = new MediaStream();
      if (prev[userId]) {
        prev[userId].getTracks().forEach(t => {
          if (t.kind !== consumer.track.kind) stream.addTrack(t);
        });
      }
      stream.addTrack(consumer.track);
      console.log('stream tracks', stream.getTracks());
      return { ...prev, [userId]: stream };
    });
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;

    const socket = io(SERVER_URL, { auth: { token, sessionId } });
    socketRef.current = socket;

    socket.on('connect', async () => {
      console.log('SOCKET CONNECTED', socket.id);
      setConnected(true);

      // 1. Get router RTP capabilities
      const rtpCapabilities = await emit('getRouterRtpCapabilities');

      // 2. Create device
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      // 3. Create send transport
      const sendParams = await emit('createTransport', { direction: 'send' });
      console.log("sendParams iceServers", JSON.stringify(sendParams.iceServers));
      const sendTransport = device.createSendTransport({ ...sendParams, iceServers: sendParams.iceServers });
      sendTransportRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }, cb) => {
        emit('connectTransport', { direction: 'send', dtlsParameters }).then(cb);
      });
      sendTransport.on('produce', ({ kind, rtpParameters, appData }, cb) => {
        emit('produce', { kind, rtpParameters, appData }).then(({ id }) => cb({ id }));
      });

      // 4. Create recv transport
      const recvParams = await emit('createTransport', { direction: 'recv' });
      const recvTransport = device.createRecvTransport({ ...recvParams, iceServers: recvParams.iceServers });
      recvTransportRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }, cb) => {
        emit('connectTransport', { direction: 'recv', dtlsParameters }).then(cb);
      });

      // Mark recv transport as ready and drain any buffered producers
      recvReady.current = true;
      for (const p of pendingProducers.current) await consumeProducer(p);
      pendingProducers.current = [];

      // 5. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 6. Produce tracks
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) await sendTransport.produce({ track: audioTrack });
      if (videoTrack) await sendTransport.produce({ track: videoTrack });

      // 7. Consume existing producers
      const existing = await emit('getProducers');
      console.log('EXISTING PRODUCERS', existing);
      for (const p of existing) await consumeProducer(p);
    });

    socket.on('newProducer', (data) => {
      console.log('NEW PRODUCER', data);
      if (recvReady.current) {
        consumeProducer(data);
      } else {
        pendingProducers.current.push(data);
      }
    });

    socket.on('participantJoined', ({ userId, name, role }) => {
      setParticipants((p) => [...p.filter((x) => x.userId !== userId), { userId, name, role }]);
    });

    socket.on('participantLeft', ({ userId }) => {
      setParticipants((p) => p.filter((x) => x.userId !== userId));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on('chatMessage', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('recordingStatus', ({ status, url }) => {
      setRecordingStatus(status);
    });

    socket.on('disconnect', () => setConnected(false));

    const statsInterval = setInterval(async () => {
      if (!sendTransportRef.current) return;
      try {
        setNetworkQuality(connected ? 3 : 1);
      } catch {}
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      recvReady.current = false;
      pendingProducers.current = [];
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socket.disconnect();
    };
  }, [sessionId, token]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
  }, []);

  const sendChat = useCallback((message, fileUrl, fileName, type) => {
    socketRef.current?.emit('chatMessage', { message, fileUrl, fileName, type });
  }, []);

  const startRecording = useCallback(() => emit('startRecording'), []);
  const stopRecording = useCallback(() => emit('stopRecording'), []);

  return {
    connected, localStream, remoteStreams, participants,
    chatMessages, recordingStatus, networkQuality,
    isMuted, isVideoOff, toggleMute, toggleVideo,
    sendChat, startRecording, stopRecording,
  };
}