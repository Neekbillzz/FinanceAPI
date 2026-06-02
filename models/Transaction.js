const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer', 'savings'],
    required: [true, 'Transaction type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      // Expense categories
      'food', 'transport', 'housing', 'utilities', 'healthcare',
      'entertainment', 'shopping', 'education', 'travel', 'personal',
      'insurance', 'debt', 'subscriptions', 'gifts', 'other_expense',
      // Income categories
      'salary', 'freelance', 'investment', 'bonus', 'rental', 'other_income',
      // Savings
      'savings_deposit', 'savings_withdrawal',
      // Transfer
      'transfer',
    ],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  budget: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget',
    default: null,
  },
  savingsGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavingsGoal',
    default: null,
  },
  tags: [{ type: String, trim: true }],
  notes: { type: String, maxlength: 500 },
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null,
  },
  location: { type: String, trim: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_money', 'crypto', 'other'],
    default: 'card',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ───────────────────────────────────────────────────────────────
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, type: 1 });
TransactionSchema.index({ user: 1, category: 1 });
TransactionSchema.index({ user: 1, date: -1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);