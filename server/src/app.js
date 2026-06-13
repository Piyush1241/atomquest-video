const express = require('express');
const cors = require('cors');
const { register } = require('prom-client');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const metricsRoutes = require('./routes/metrics');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/metrics', metricsRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
