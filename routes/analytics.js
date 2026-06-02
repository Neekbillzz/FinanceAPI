const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getOverview, getSpendingSummary, getSavingsCalculation, getMonthlyComparison
} = require('../controllers/analyticsController');

const router = express.Router();
router.use(protect);
router.get('/overview', getOverview);
router.get('/spending-summary', getSpendingSummary);
router.get('/savings-calculation', getSavingsCalculation);
router.get('/monthly-comparison', getMonthlyComparison);

module.exports = router;