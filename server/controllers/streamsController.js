const Stream = require('../models/Stream');
const User = require('../models/User');

// @desc    Get all streams
// @route   GET /api/streams
// @access  Public
const getStreams = async (req, res) => {
  try {
    const streams = await Stream.find().populate('user', 'username profilePicture');
    res.json(streams);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new stream
// @route   POST /api/streams
// @access  Private
const createStream = async (req, res) => {
  const { title, description, platforms } = req.body;

  try {
    const newStream = new Stream({
      title,
      description,
      platforms,
      user: req.user.id,
    });

    const stream = await newStream.save();
    res.json(stream);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get a single stream
// @route   GET /api/streams/:id
// @access  Public
const getStreamById = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate('user', 'username profilePicture');

    if (!stream) {
      return res.status(404).json({ msg: 'Stream not found' });
    }

    res.json(stream);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Stream not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Update a stream
// @route   PUT /api/streams/:id
// @access  Private
const updateStream = async (req, res) => {
  const { title, description, platforms, isLive } = req.body;

  try {
    let stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ msg: 'Stream not found' });
    }

    // Check user
    if (stream.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    stream.title = title || stream.title;
    stream.description = description || stream.description;
    stream.platforms = platforms || stream.platforms;
    if (isLive !== undefined) {
      stream.isLive = isLive;
    }

    stream = await stream.save();

    res.json(stream);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a stream
// @route   DELETE /api/streams/:id
// @access  Private
const deleteStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ msg: 'Stream not found' });
    }

    // Check user
    if (stream.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await stream.remove();

    res.json({ msg: 'Stream removed' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Stream not found' });
    }
    res.status(500).send('Server Error');
  }
};


module.exports = {
  getStreams,
  createStream,
  getStreamById,
  updateStream,
  deleteStream,
};
