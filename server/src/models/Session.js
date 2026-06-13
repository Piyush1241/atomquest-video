const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: String,
  name: String,
  role: { type: String, enum: ['agent', 'customer'] },
  joinedAt: { type: Date, default: Date.now },
  leftAt: Date,
});

const chatMessageSchema = new mongoose.Schema({
  userId: String,
  name: String,
  message: String,
  fileUrl: String,
  fileName: String,
  type: { type: String, enum: ['text', 'file'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, required: true },
  agentId: { type: String, required: true },
  agentName: String,
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  inviteToken: { type: String, unique: true },
  participants: [participantSchema],
  chat: [chatMessageSchema],
  recordingStatus: { type: String, enum: ['idle', 'recording', 'processing', 'ready'], default: 'idle' },
  recordingUrl: String,
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', sessionSchema);
