// ============================================================
// controllers/budgetController.js
// FIXES:
//   BUG 5 — submitBudget() was a React/axios frontend function accidentally
//            pasted into this backend controller file. It used useState, axios,
//            localStorage — none of which exist in Node.js. This caused a
//            runtime crash the moment any budget route was hit.
//   BUG 6 — createBudget export was completely missing. The route imports it
//            but it didn't exist, so POST /api/budgets crashed with:
//            "createBudget is not a function"
//   BUG 7 — mongoose.Types.ObjectId() used without import in recalculate.
//            Fixed by adding the mongoose require.
// ============================================================

const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// ── GET /api/budgets ──────────────────────────────────────────
exports.getBudgets = async (req, res) => {
  try {
    const { isActive, period } = req.query;
    const query = { user: req.user._id };

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (period) query.period = period;

    const budgets = await Budget.find(query).sort({ createdAt: -1 });

    const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0);

    res.json({
      success: true,
      count: budgets.length,
      totalBudgeted,
      totalSpent,
      totalRemaining: totalBudgeted - totalSpent,
      budgets,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/budgets ─────────────────────────────────────────
exports.createBudget = async (req, res) => {
  try {
    const {
      name, category, limit, period = 'monthly',
      startDate, endDate, alertAt, color,
    } = req.body;

    // If dates not supplied, default to current calendar month
    const now   = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const budget = await Budget.create({
      user: req.user._id,
      name,
      category,
      limit: parseFloat(limit),
      period,
      startDate: start,
      endDate:   end,
      alertAt:   alertAt || 80,
      color:     color   || '#6366f1',
    });

    res.status(201).json({ success: true, budget });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/budgets/:id ──────────────────────────────────────
exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found.' });
    }

    res.json({ success: true, budget });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/budgets/:id ───────────────────────────────────
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found.' });
    }

    res.json({ success: true, message: 'Budget deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/budgets/:id/recalculate ────────────────────────
exports.recalculateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found.' });
    }

    // Sum all expense transactions for this category within the budget period
    const result = await Transaction.aggregate([
      {
        $match: {
          user:     new mongoose.Types.ObjectId(req.user._id),
          type:     'expense',
          category: budget.category,
          date:     { $gte: budget.startDate, $lte: budget.endDate },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    budget.spent = result[0]?.total || 0;
    await budget.save();

    res.json({ success: true, budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};