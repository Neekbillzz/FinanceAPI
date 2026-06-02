const { validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// ─── Helper ────────────────────────────────────────────────────────────────
const sendTokens = (user, statusCode, res) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  return res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
};

// ─── POST /api/auth/register ───────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, currency, monthlyIncome } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, currency, monthlyIncome });

    // Welcome notification
    await Notification.create({
      user: user._id,
      type: 'system',
      title: 'Welcome to FinTrack! 🎉',
      message: `Hi ${name}! Your account is ready. Start by adding your first transaction or setting a savings goal.`,
      severity: 'success',
    });

    sendTokens(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ──────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokens(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/refresh ────────────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const accessToken = user.generateAccessToken();
    res.json({ success: true, accessToken });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/auth/change-password ────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ─────────────────────────────────────────────────
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};