require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./db');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

app.get('/health', (req, res) => res.json({ ok: true }));

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Init socket AFTER server is listening
    try {
      const { initSocket } = require('./socket');
      initSocket(server);
    } catch (err) {
      console.error('Socket/mediasoup init failed:', err.message);
    }
  });
});
