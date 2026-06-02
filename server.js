<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> d27b906 (-_-)
require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3021

console.log(PORT)

app.listen(PORT, () => {
    console.log(`Api is listening on port ${PORT}`)
<<<<<<< HEAD
})
=======
})
=======
// ============================================================
// server.js
// FIXES:
//   BUG 10 — require('dotenv').config() was called TWICE (line 1 and line 8).
//             Harmless but messy; removed the duplicate.
//   BUG 11 — mongoose.connect() passed { useNewUrlParser, useUnifiedTopology }
//             which are deprecated in Mongoose 7 and print deprecation warnings.
//             Removed both deprecated options.
// ============================================================

require('dotenv').config();   // called ONCE only

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const transactionRoutes  = require('./routes/transactions');
const budgetRoutes       = require('./routes/budgets');
const savingsRoutes      = require('./routes/savings');
const analyticsRoutes    = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

const { scheduleNotificationJobs } = require('./utils/scheduler');
const { errorHandler }             = require('./middleware/error');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api/',      limiter);
app.use('/api/auth/', authLimiter);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/budgets',       budgetRoutes);
app.use('/api/savings',       savingsRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'FinTrack API is running',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Connect DB then start ─────────────────────────────────────
const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  try {
    // BUG 11 FIX: removed deprecated useNewUrlParser and useUnifiedTopology options
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀  FinTrack API running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    scheduleNotificationJobs();
  });
});

module.exports = app;
>>>>>>> cfa3103 (My Work)
>>>>>>> d27b906 (-_-)
