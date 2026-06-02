// ============================================================
// controllers/analyticsController.js
// FIXES:
//   BUG 9 — mongoose.Types.ObjectId() called without `new` in 4 places.
//            In Mongoose 7+ this throws: "Class constructor ObjectId cannot
//            be invoked without 'new'"
//            All 4 calls now use: new mongoose.Types.ObjectId(req.user.id)
// ============================================================

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const User = require('../models/User');

// ── GET /api/analytics/overview ──────────────────────────────
exports.getOverview = async (req, res, next) => {
  try {
    // BUG 9 FIX: added `new`
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':  startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year':  startDate = new Date(now.getFullYear(), 0, 1); break;
      default:      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [summary, categoryBreakdown, dailyTrend] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: startDate } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    const totals = { income: 0, expense: 0, savings: 0, transfer: 0, count: 0 };
    summary.forEach(s => {
      totals[s._id] = s.total;
      totals.count += s.count;
    });
    totals.balance     = totals.income - totals.expense;
    totals.savingsRate = totals.income > 0
      ? Math.round(((totals.income - totals.expense) / totals.income) * 100)
      : 0;

    const trendMap = {};
    dailyTrend.forEach(d => {
      const key = d._id.date;
      if (!trendMap[key]) trendMap[key] = { date: key, income: 0, expense: 0, savings: 0 };
      trendMap[key][d._id.type] = d.total;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, period, startDate, overview: totals, categoryBreakdown, dailyTrend: trend });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analytics/spending-summary ──────────────────────
exports.getSpendingSummary = async (req, res, next) => {
  try {
    // BUG 9 FIX: added `new`
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now    = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisMonth, lastMonth, topMerchants, weeklyPattern] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: thisMonthStart } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: thisMonthStart } } },
        { $group: { _id: '$description', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
        { $limit: 5 },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: thisMonthStart } } },
        {
          $group: {
            _id:    { $dayOfWeek: '$date' },
            amount: { $sum: '$amount' },
            count:  { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const lastMonthMap = {};
    lastMonth.forEach(l => (lastMonthMap[l._id] = l.amount));

    const categories = thisMonth.map(c => ({
      category:  c._id,
      amount:    c.amount,
      count:     c.count,
      lastMonth: lastMonthMap[c._id] || 0,
      change:    lastMonthMap[c._id]
        ? Math.round(((c.amount - lastMonthMap[c._id]) / lastMonthMap[c._id]) * 100)
        : null,
    }));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekly   = weeklyPattern.map(d => ({
      day:    dayNames[d._id - 1] || 'Unknown',
      amount: d.amount,
      count:  d.count,
    }));

    res.json({ success: true, categories, topMerchants, weeklyPattern: weekly });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analytics/savings-calculation ────────────────────
exports.getSavingsCalculation = async (req, res, next) => {
  try {
    // BUG 9 FIX: added `new`
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user   = await User.findById(userId);
    const now    = new Date();

    const [savingsGoals, monthlySavings] = await Promise.all([
      SavingsGoal.find({ user: userId }),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: { $in: ['income', 'expense'] },
            date: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
          },
        },
        {
          $group: {
            _id:   { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const monthMap = {};
    monthlySavings.forEach(m => {
      const key = `${m._id.year}-${String(m._id.month).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { period: key, income: 0, expense: 0 };
      monthMap[key][m._id.type] = m.total;
    });

    const monthlyNetSavings = Object.values(monthMap).map(m => ({
      period:      m.period,
      income:      m.income,
      expense:     m.expense,
      netSavings:  m.income - m.expense,
      savingsRate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
    }));

    const avgMonthlySavings = monthlyNetSavings.length > 0
      ? monthlyNetSavings.reduce((s, m) => s + m.netSavings, 0) / monthlyNetSavings.length
      : 0;

    const goalProjections = savingsGoals.map(goal => {
      const monthsNeeded    = goal.remaining > 0 && avgMonthlySavings > 0
        ? Math.ceil(goal.remaining / avgMonthlySavings) : null;
      const projectedDate   = monthsNeeded
        ? new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1) : null;
      return {
        goalId:                  goal._id,
        name:                    goal.name,
        targetAmount:            goal.targetAmount,
        currentAmount:           goal.currentAmount,
        remaining:               goal.remaining,
        progressPercent:         goal.progressPercent,
        targetDate:              goal.targetDate,
        daysLeft:                goal.daysLeft,
        requiredMonthly:         goal.requiredMonthly,
        projectedCompletionDate: projectedDate,
        onTrack:                 projectedDate ? projectedDate <= goal.targetDate : false,
        icon:                    goal.icon,
      };
    });

    res.json({
      success: true,
      summary: {
        monthlyIncome:     user.monthlyIncome,
        avgMonthlySavings: Math.round(avgMonthlySavings),
        savingsRate:       user.monthlyIncome > 0
          ? Math.round((avgMonthlySavings / user.monthlyIncome) * 100) : 0,
        totalSavingsGoals: savingsGoals.length,
        activeGoals:       savingsGoals.filter(g => !g.isCompleted).length,
        completedGoals:    savingsGoals.filter(g => g.isCompleted).length,
      },
      monthlyTrend: monthlyNetSavings,
      goalProjections,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analytics/monthly-comparison ────────────────────
exports.getMonthlyComparison = async (req, res, next) => {
  try {
    // BUG 9 FIX: added `new`
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const months = parseInt(req.query.months) || 6;
    const now    = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const data = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: startDate } } },
      {
        $group: {
          _id:   { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map        = {};
    data.forEach(d => {
      const key = `${d._id.year}-${String(d._id.month).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = {
          period: key,
          label:  `${monthNames[d._id.month - 1]} ${d._id.year}`,
          income: 0, expense: 0, savings: 0, transfer: 0,
        };
      }
      map[key][d._id.type] = d.total;
    });

    const comparison = Object.values(map).map(m => ({
      ...m,
      netSavings:  m.income - m.expense,
      savingsRate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
    }));

    res.json({ success: true, comparison });
  } catch (err) {
    next(err);
  }
};