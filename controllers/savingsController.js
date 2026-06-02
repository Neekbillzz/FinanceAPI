const SavingsGoal = require('../models/SavingsGoal');
const Transaction = require('../models/Transaction');
const createNotification = require('../utils/createNotification');
console.log("createNotification:", createNotification);

// ─── GET /api/savings ──────────────────────────────────────────────────────
exports.getSavingsGoals = async (req, res, next) => {
  try {
    const { isCompleted } = req.query;
    const query = { user: req.user.id };
    if (isCompleted !== undefined) query.isCompleted = isCompleted === 'true';

    const goals = await SavingsGoal.find(query).sort({ createdAt: -1 });
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

    res.json({
      success: true,
      count: goals.length,
      totalSaved,
      totalTarget,
      overallProgress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
      goals,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/savings ─────────────────────────────────────────────────────
exports.createSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.create({ ...req.body, user: req.user.id });
    await createNotification(req.user.id, {
      type: 'savings_update',
      title: `New Goal Created: ${goal.name} ${goal.icon}`,
      message: `You've set a savings goal of $${goal.targetAmount.toLocaleString()} for "${goal.name}". Let's make it happen!`,
      severity: 'success',
      data: { goalId: goal._id },
    });
    res.status(201).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/savings/:id/deposit ────────────────────────────────────────
exports.makeDeposit = async (req, res, next) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount.' });
    }

    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found.' });

    const prevPercent = goal.progressPercent;
    goal.currentAmount += parseFloat(amount);
    goal.deposits.push({ amount, note });

    const wasCompleted = goal.isCompleted;
    if (goal.currentAmount >= goal.targetAmount && !wasCompleted) {
      goal.isCompleted = true;
      goal.completedAt = new Date();
    }
    await goal.save();

    // Create transaction record
    await Transaction.create({
      user: req.user.id,
      type: 'savings',
      category: 'savings_deposit',
      amount,
      description: `Savings deposit: ${goal.name}`,
      savingsGoal: goal._id,
      date: new Date(),
    });

    // Milestone notifications
    const newPercent = goal.progressPercent;
    const milestones = [25, 50, 75, 90, 100];
    for (const m of milestones) {
      if (prevPercent < m && newPercent >= m) {
        const isComplete = m === 100;
        await createNotification(req.user.id, {
          type: isComplete ? 'savings_goal_completed' : 'savings_milestone',
          title: isComplete
            ? `🎉 Goal Achieved: ${goal.name}!`
            : `🏆 ${m}% Milestone: ${goal.name}`,
          message: isComplete
            ? `Congratulations! You've reached your savings goal of $${goal.targetAmount.toLocaleString()}!`
            : `Amazing progress! You're ${m}% of the way to your "${goal.name}" goal.`,
          severity: isComplete ? 'success' : 'info',
          data: { goalId: goal._id, percent: m },
        });
        break;
      }
    }

    res.json({ success: true, goal, deposited: amount });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/savings/:id ──────────────────────────────────────────────────
exports.updateSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found.' });
    res.json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/savings/:id ───────────────────────────────────────────────
exports.deleteSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ success: false, message: 'Savings goal not found.' });
    res.json({ success: true, message: 'Savings goal deleted.' });
  } catch (err) {
    next(err);
  }
};