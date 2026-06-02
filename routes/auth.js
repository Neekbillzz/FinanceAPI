// ============================================================
// routes/auth.js
// FIXES:
//   BUG 1 — 'protect' was declared TWICE (lines 1 and 8 in original),
//            causing: SyntaxError: Identifier 'protect' has already been declared
//   BUG 2 — Two leftover console.log debug statements removed
// ============================================================

const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');          // declared ONCE only
const {
  register,
  login,
  refresh,
  getMe,
  logout,
  changePassword,
} = require('../controllers/authController');

const router = express.Router();

// ── POST /api/auth/register ───────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  register
);

// ── POST /api/auth/login ──────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', refresh);

// ── GET /api/auth/me  (protected) ────────────────────────────
router.get('/me', protect, getMe);

// ── POST /api/auth/logout  (protected) ───────────────────────
router.post('/logout', protect, logout);

// ── PUT /api/auth/change-password  (protected) ───────────────
router.put('/change-password', protect, changePassword);

module.exports = router;