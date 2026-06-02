const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'savings_update', 'savings_milestone', 'savings_goal_completed',
      'overspending_warning', 'budget_exceeded', 'budget_approaching',
      'low_balance', 'transaction_added', 'weekly_report', 'system'
    ],
    required: true,
  },
  title: { type: String, required: true, maxlength: 100 },
  message: { type: String, required: true, maxlength: 500 },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  actionUrl: { type: String, default: null },
}, {
  timestamps: true,
});

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);