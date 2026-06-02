const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getSavingsGoals, createSavingsGoal, makeDeposit,
  updateSavingsGoal, deleteSavingsGoal
} = require('../controllers/savingsController');

const router = express.Router();
router.use(protect);
router.route('/').get(getSavingsGoals).post(createSavingsGoal);
router.route('/:id').put(updateSavingsGoal).delete(deleteSavingsGoal);
router.post('/:id/deposit', makeDeposit);

module.exports = router;