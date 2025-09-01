const ChatMessage = require('../models/ChatMessage');
const Stream = require('../models/Stream');
const User = require('../models/User');

// @desc    Get chat messages for a stream
// @route   GET /api/chat/:streamId
// @access  Public
const getChatMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ stream: req.params.streamId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: 'asc' });
    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Post a new chat message
// @route   POST /api/chat/:streamId
// @access  Private
const postChatMessage = async (req, res) => {
  const { message, platform } = req.body;
  const { streamId } = req.params;

  try {
    // Check if stream exists
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ msg: 'Stream not found' });
    }

    const newMessage = new ChatMessage({
      message,
      platform,
      stream: streamId,
      user: req.user.id,
    });

    const savedMessage = await newMessage.save();

    // In a real application, you would broadcast this message using WebSockets
    // For now, we'll just return the saved message
    const populatedMessage = await ChatMessage.findById(savedMessage._id).populate('user', 'username profilePicture');

    res.json(populatedMessage);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getChatMessages,
  postChatMessage,
};
