require('dotenv').config();
const connectDB = require('./server/config/db');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Define Routes
app.use('/api/users', require('./server/routes/users'));
app.use('/api/chat', require('./server/routes/chat'));
app.use('/api/streams', require('./server/routes/streams'));

// Error Handling Middleware
const { notFound, errorHandler } = require('./server/middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
