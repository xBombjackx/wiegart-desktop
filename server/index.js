require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tmi = require('tmi.js');
const { YouTubeChat } = require('youtube-chat');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow requests from the React app

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app's default address
    methods: ["GET", "POST"]
  }
});

// --- Twitch Connection ---
// NOTE: For a real app, this should be configurable.
// I'm using a popular channel here so you can see messages immediately.
const twitchClient = new tmi.Client({
  channels: [ 'gamesdonequick' ]
});

twitchClient.connect().catch(console.error);

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return; // Ignore messages from the bot itself

  // Construct a unified message object
  const chatMessage = {
    platform: 'twitch',
    username: tags['display-name'],
    message: message,
    id: `twitch-${tags['id']}`,
    color: tags['color'] || '#FFFFFF' // Use user's Twitch color or default to white
  };

  // Send the message to all connected frontend clients
  io.emit('chat message', chatMessage);
});

// --- YouTube Connection ---
// NOTE: For a real app, this should be configurable.
const youtubeChat = new YouTubeChat({
  apiKey: process.env.YOUTUBE_API_KEY,
  liveId: 'jfKfPfyJRdk' // Lofi Girl stream - good for testing
});

youtubeChat.on('message', (data) => {
  // The youtube-chat library can send multiple messages at once
  data.message.forEach(messageItem => {
    const chatMessage = {
      platform: 'youtube',
      username: data.author.name,
      // Messages can be composed of text and emojis, so we combine them
      message: messageItem.text || '',
      id: `youtube-${data.id}`,
      color: '#CCCCCC' // YouTube doesn't provide user colors, so we use a default
    };

    // Send the message to all connected frontend clients
    io.emit('chat message', chatMessage);
  });
});

// Start listening for YouTube chat messages
youtubeChat.listen().catch(console.error);

youtubeChat.on('error', (err) => {
  console.error('YouTube Chat Error:', err);
});

const PORT = 3001; // Port for the backend server
server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});