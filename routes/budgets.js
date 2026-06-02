// ============================================================
// routes/budgets.js
// FIXES:
//   BUG 3 — router.use(protect) was COMMENTED OUT with //router.use(protect)
//            This made ALL budget routes publicly accessible with no auth.
//   BUG 4 — createBudget was imported but the POST / route was never wired
//            (budgetController.js has no createBudget export — handled below)
// ============================================================

const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  recalculateBudget,
} = require('../controllers/budgetController');

const router = express.Router();

router.use(protect);   // ← was commented out; ALL routes now require valid JWT

router.route('/').get(getBudgets).post(createBudget);
router.route('/:id').put(updateBudget).delete(deleteBudget);
router.post('/:id/recalculate', recalculateBudget);

module.exports = router;