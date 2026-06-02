const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const { createNotification } = require('./notifications');

exports.scheduleNotificationJobs = () => {
  console.log('⏰ Scheduling notification jobs...');

  // ─── Daily: Check low balances at 8am ─────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily balance checks...');
    try {
      const users = await User.find({ isActive: true, 'notificationPreferences.lowBalanceAlerts': true });

      for (const user of users) {
        const result = await Transaction.aggregate([
          { $match: { user: user._id } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]);

        const map = {};
        result.forEach(r => (map[r._id] = r.total));
        const balance = (map.income || 0) - (map.expense || 0);

        if (balance <= user.lowBalanceThreshold && balance >= 0) {
          await createNotification(user._id, {
            type: 'low_balance',
            title: '⚠️ Low Balance Alert',
            message: `Your current balance is $${balance.toFixed(2)}, which is below your threshold of $${user.lowBalanceThreshold}.`,
            severity: 'warning',
            data: { balance },
          });
        }
      }
    } catch (err) {
      console.error('[CRON] Balance check error:', err.message);
    }
  });

  // ─── Daily: Check budget overspending at 9am ───────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running budget overspending checks...');
    try {
      const budgets = await Budget.find({ isActive: true })
        .populate('user', 'notificationPreferences isActive');

      for (const budget of budgets) {
        if (!budget.user?.isActive || !budget.user?.notificationPreferences?.overspendingAlerts) continue;

        if (budget.percentUsed >= 100) {
          await createNotification(budget.user._id, {
            type: 'overspending_warning',
            title: `🚨 Over Budget: ${budget.name}`,
            message: `You've exceeded your "${budget.name}" budget by $${(budget.spent - budget.limit).toFixed(2)}.`,
            severity: 'error',
            data: { budgetId: budget._id },
          });
        }
      }
    } catch (err) {
      console.error('[CRON] Budget check error:', err.message);
    }
  });

  // ─── Weekly: Savings progress report (Sundays 10am) ───────────────────
  cron.schedule('0 10 * * 0', async () => {
    console.log('[CRON] Running weekly savings reports...');
    try {
      const users = await User.find({ isActive: true, 'notificationPreferences.savingsUpdates': true });

      for (const user of users) {
        const goals = await SavingsGoal.find({ user: user._id, isCompleted: false });
        if (goals.length === 0) continue;

        const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
        const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
        const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

        await createNotification(user._id, {
          type: 'savings_update',
          title: '📊 Weekly Savings Report',
          message: `You have ${goals.length} active savings goal(s). Overall progress: ${overallProgress}% ($${totalSaved.toLocaleString()} of $${totalTarget.toLocaleString()}).`,
          severity: 'info',
          data: { totalSaved, totalTarget, overallProgress, goalCount: goals.length },
        });
      }
    } catch (err) {
      console.error('[CRON] Savings report error:', err.message);
    }
  });

  console.log('✅ Notification jobs scheduled.');
};