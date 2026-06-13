const router = require('express').Router();
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const activeSessions = new client.Gauge({
  name: 'video_active_sessions',
  help: 'Number of currently active video sessions',
  registers: [register],
});

const connectedParticipants = new client.Gauge({
  name: 'video_connected_participants',
  help: 'Total participants currently in calls',
  registers: [register],
});

const sessionErrors = new client.Counter({
  name: 'video_session_errors_total',
  help: 'Total session errors',
  registers: [register],
});

router.get('/', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = router;
module.exports.metrics = { activeSessions, connectedParticipants, sessionErrors };
