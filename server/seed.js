require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({ email: { $in: ['agent@demo.com', 'admin@demo.com'] } });
  await User.create([
    { name: 'Demo Agent', email: 'agent@demo.com', password: 'demo123', role: 'agent' },
    { name: 'Demo Admin', email: 'admin@demo.com', password: 'demo123', role: 'admin' },
  ]);
  console.log('Seeded: agent@demo.com / demo123 and admin@demo.com / demo123');
  process.exit(0);
}

seed().catch(console.error);
