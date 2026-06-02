const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getNotifications, markRead, markAllRead, deleteNotification, clearAll
} = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);
router.route('/').get(getNotifications).delete(clearAll);
router.put('/read-all', markAllRead);
router.route('/:id/read').put(markRead);
router.route('/:id').delete(deleteNotification);

module.exports = router;