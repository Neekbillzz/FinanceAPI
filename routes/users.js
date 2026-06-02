const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();
router.use(protect);

// Update profile
router.put('/profile', async (req, res, next) => {
  try {
    const allowed = ['name', 'currency', 'monthlyIncome', 'lowBalanceThreshold', 'notificationPreferences', 'avatar'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

// Delete own account
router.delete('/me', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated.' });
  } catch (err) { next(err); }
});

// Admin: list all users
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }).select('-password -refreshToken');
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
});

module.exports = router;