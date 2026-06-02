// ============================================================
// controllers/transactionController.js
// FIXES:
//   BUG 8 — mongoose.Types.ObjectId(userId) is deprecated in Mongoose 7+
//            and throws: "TypeError: Class constructor ObjectId cannot be
//            invoked without 'new'"
//            Fixed by using: new mongoose.Types.ObjectId(userId)
// ============================================================

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');

// ── GET /api/transactions ─────────────────────────────────────
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      type, category, startDate, endDate,
      page = 1, limit = 20, sort = '-date',
      search, minAmount, maxAmount,
    } = req.query;

    const query = { user: req.user.id };

    if (type)     query.type     = type;
    if (category) query.category = category;
    if (search)   query.description = { $regex: search, $options: 'i' };

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate + 'T23:59:59');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('budget',      'name category')
        .populate('savingsGoal', 'name icon'),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      count:       transactions.length,
      total,
      pages:       Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/transactions ────────────────────────────────────
exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.create({ ...req.body, user: req.user.id });

    // Update linked budget's spent total
    if (transaction.type === 'expense' && transaction.budget) {
      const budget = await Budget.findOne({ _id: transaction.budget, user: req.user.id });
      if (budget) {
        budget.spent += transaction.amount;
        await budget.save();

        if (budget.percentUsed >= 100) {
          await createNotification(req.user.id, {
            type:     'budget_exceeded',
            title:    `Budget Exceeded: ${budget.name}`,
            message:  `Your "${budget.name}" budget has been exceeded by $${(budget.spent - budget.limit).toFixed(2)}.`,
            severity: 'error',
            data:     { budgetId: budget._id, spent: budget.spent, limit: budget.limit },
          });
        } else if (budget.percentUsed >= budget.alertAt) {
          await createNotification(req.user.id, {
            type:     'budget_approaching',
            title:    `Budget Alert: ${budget.name}`,
            message:  `You've used ${budget.percentUsed}% of your "${budget.name}" budget. $${budget.remaining.toFixed(2)} remaining.`,
            severity: 'warning',
            data:     { budgetId: budget._id },
          });
        }
      }
    }

    // Low balance alert
    if (transaction.type === 'expense') {
      const user         = await User.findById(req.user.id);
      const totalBalance = await getBalanceSummary(req.user.id);
      if (totalBalance.balance <= user.lowBalanceThreshold) {
        await createNotification(req.user.id, {
          type:     'low_balance',
          title:    '⚠️ Low Balance Alert',
          message:  `Your balance is low: $${totalBalance.balance.toFixed(2)}. Consider reducing expenses.`,
          severity: 'warning',
          data:     { balance: totalBalance.balance },
        });
      }
    }

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/transactions/:id ─────────────────────────────────
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
      .populate('budget',      'name category limit spent')
      .populate('savingsGoal', 'name icon targetAmount currentAmount');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    res.json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/transactions/:id ─────────────────────────────────
exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    res.json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/transactions/:id ──────────────────────────────
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    res.json({ success: true, message: 'Transaction deleted.' });
  } catch (err) {
    next(err);
  }
};

// ── Internal helper ───────────────────────────────────────────
async function getBalanceSummary(userId) {
  const result = await Transaction.aggregate([
    // BUG 8 FIX: use `new` keyword with ObjectId constructor
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const map     = {};
  result.forEach(r => (map[r._id] = r.total));
  const income  = map.income  || 0;
  const expense = map.expense || 0;
  return { income, expense, balance: income - expense };
}

exports.getBalanceSummary = getBalanceSummary;