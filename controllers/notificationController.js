const createNotification = require('../utils/createNotification');

// ─── GET /api/notifications ────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { user: req.user.id };
    if (unreadOnly === 'true') query.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
    ]);

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pages: Math.ceil(total / parseInt(limit)),
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/:id/read ──────────────────────────────────────
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/read-all ──────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/notifications/:id ────────────────────────────────────────
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/notifications ─────────────────────────────────────────────
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    next(err);
  }
};