const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
} = require('../controllers/usersController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST api/users/register
// @desc    Register user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/users/login
// @desc    Login user / return JWT
// @access  Public
router.post('/login', loginUser);

// @route   GET api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', protect, getUserProfile);

module.exports = router;
