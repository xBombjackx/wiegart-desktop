const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true,
  },
  platform: {
    type: String,
    required: true,
    enum: ['twitch', 'youtube', 'tiktok', 'site'],
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
