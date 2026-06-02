const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Budget name is required'],
    trim: true,
    maxlength: 100,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'food', 'transport', 'housing', 'utilities', 'healthcare',
      'entertainment', 'shopping', 'education', 'travel', 'personal',
      'insurance', 'debt', 'subscriptions', 'gifts', 'other_expense',
    ],
  },
  limit: {
    type: Number,
    required: [true, 'Budget limit is required'],
    min: [1, 'Budget limit must be positive'],
  },
  spent: {
    type: Number,
    default: 0,
    min: 0,
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: 'monthly',
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  alertAt: {
    type: Number,
    default: 80, // alert at 80% spent
    min: 1,
    max: 100,
  },
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#6366f1' },
  notes: { type: String, maxlength: 300 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Virtuals ──────────────────────────────────────────────────────────────
BudgetSchema.virtual('remaining').get(function () {
  return Math.max(0, this.limit - this.spent);
});

BudgetSchema.virtual('percentUsed').get(function () {
  if (this.limit === 0) return 0;
  return Math.min(100, Math.round((this.spent / this.limit) * 100));
});

BudgetSchema.virtual('isOverBudget').get(function () {
  return this.spent > this.limit;
});

BudgetSchema.index({ user: 1, category: 1, period: 1 });
BudgetSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);