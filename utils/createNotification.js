// ============================================================
// utils/createNotification.js
// Location: C:\Users\KARL\Downloads\Capstone\utils\createNotification.js
// ============================================================

const Notification = require('../models/Notification');

/**
 * Creates a notification document in MongoDB.
 * Called internally by controllers — never by the client directly.
 *
 * @param {string} userId  - MongoDB ObjectId of the user
 * @param {object} payload - { type, title, message, severity, data }
 */
const createNotification = async (userId, payload) => {
  try {
    return await Notification.create({ user: userId, ...payload });
  } catch (err) {
    // Non-fatal — log but don't crash the main request
    console.error('[Notification] Failed to create:', err.message);
  }
};

module.exports = createNotification;