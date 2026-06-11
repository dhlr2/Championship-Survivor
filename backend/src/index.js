require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const pickRoutes = require('./routes/picks');
const { startCron } = require('./services/cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.set('trust proxy', 1); // Trust Render's proxy
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://championship-survivor.vercel.app'
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/picks', pickRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Last Man Standing API running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    startCron();
  }
});

module.exports = app;
