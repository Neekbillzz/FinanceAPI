const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getTransactions, createTransaction, getTransaction,
  updateTransaction, deleteTransaction
} = require('../controllers/transactionController');

const router = express.Router();
router.use(protect);

router.route('/').get(getTransactions).post(createTransaction);
router.route('/:id').get(getTransaction).put(updateTransaction).delete(deleteTransaction);

module.exports = router;