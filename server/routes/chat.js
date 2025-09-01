const express = require('express');
const router = express.Router();
const {
  getChatMessages,
  postChatMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET api/chat/:streamId
// @desc    Get all chat messages for a stream
// @access  Public
router.get('/:streamId', getChatMessages);

// @route   POST api/chat/:streamId
// @desc    Post a new chat message
// @access  Private
router.post('/:streamId', protect, postChatMessage);

module.exports = router;
