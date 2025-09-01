const express = require('express');
const router = express.Router();
const {
  getStreams,
  createStream,
  getStreamById,
  updateStream,
  deleteStream,
} = require('../controllers/streamsController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET api/streams
// @desc    Get all streams
// @access  Public
router.get('/', getStreams);

// @route   POST api/streams
// @desc    Create a new stream
// @access  Private
router.post('/', protect, createStream);

// @route   GET api/streams/:id
// @desc    Get a single stream
// @access  Public
router.get('/:id', getStreamById);

// @route   PUT api/streams/:id
// @desc    Update a stream
// @access  Private
router.put('/:id', protect, updateStream);

// @route   DELETE api/streams/:id
// @desc    Delete a stream
// @access  Private
router.delete('/:id', protect, deleteStream);

module.exports = router;
