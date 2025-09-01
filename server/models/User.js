const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  twitchId: {
    type: String,
    unique: true,
    sparse: true,
  },
  youtubeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  tiktokId: {
    type: String,
    unique: true,
    sparse: true,
  },
  profilePicture: {
    type: String,
    default: 'default_profile_picture.png',
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
