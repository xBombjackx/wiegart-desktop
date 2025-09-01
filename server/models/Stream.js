const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  platforms: [{
    name: {
      type: String,
      required: true,
      enum: ['twitch', 'youtube', 'tiktok'],
    },
    streamKey: {
      type: String,
      required: true,
    },
    streamUrl: {
        type: String,
        required: true,
    }
  }],
  isLive: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream;
