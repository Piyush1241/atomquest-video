const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const { authMiddleware, agentOnly, adminOnly } = require('../middleware/auth');

// Agent: create a new session
router.post('/', authMiddleware, agentOnly, async (req, res) => {
  try {
    const sessionId = uuidv4();
    const inviteToken = jwt.sign(
      { sessionId, role: 'customer', name: req.body.customerName || 'Customer' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const session = await Session.create({
      sessionId,
      agentId: req.user.userId,
      agentName: req.user.name,
      inviteToken,
    });
    const inviteUrl = `${process.env.CLIENT_URL}/join/${inviteToken}`;
    res.json({ session, inviteUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sessions (agent sees own, admin sees all)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { agentId: req.user.userId };
    const sessions = await Session.find(filter).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single session
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validate invite token — used by customer join page
router.get('/invite/:token', async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const session = await Session.findOne({ sessionId: payload.sessionId });
    if (!session || session.status === 'ended') {
      return res.status(400).json({ error: 'Session no longer available' });
    }
    res.json({ sessionId: payload.sessionId, role: payload.role, name: payload.name });
  } catch {
    res.status(400).json({ error: 'Invalid or expired invite link' });
  }
});

// Agent: end a session
router.post('/:sessionId/end', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && session.agentId !== req.user.userId) {
      return res.status(403).json({ error: 'Not your session' });
    }
    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: force-end any session
router.post('/:sessionId/force-end', authMiddleware, adminOnly, async (req, res) => {
  try {
    await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { status: 'ended', endedAt: new Date() }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
