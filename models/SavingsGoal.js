const mongoose = require('mongoose');

const SavingsGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true,
    maxlength: 100,
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [1, 'Target must be positive'],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  targetDate: {
    type: Date,
    required: [true, 'Target date is required'],
  },
  category: {
    type: String,
    enum: [
      'emergency_fund', 'vacation', 'house', 'car', 'education',
      'wedding', 'retirement', 'investment', 'gadget', 'medical', 'other'
    ],
    default: 'other',
  },
  icon: { type: String, default: '🎯' },
  color: { type: String, default: '#10b981' },
  description: { type: String, maxlength: 300 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  monthlyContribution: { type: Number, default: 0 },
  deposits: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Virtuals ──────────────────────────────────────────────────────────────
SavingsGoalSchema.virtual('progressPercent').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

SavingsGoalSchema.virtual('remaining').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

SavingsGoalSchema.virtual('daysLeft').get(function () {
  const now = new Date();
  const diff = this.targetDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

SavingsGoalSchema.virtual('requiredMonthly').get(function () {
  const monthsLeft = this.daysLeft / 30;
  if (monthsLeft <= 0) return this.remaining;
  return Math.ceil(this.remaining / monthsLeft);
});

SavingsGoalSchema.index({ user: 1, isCompleted: 1 });

module.exports = mongoose.model('SavingsGoal', SavingsGoalSchema);