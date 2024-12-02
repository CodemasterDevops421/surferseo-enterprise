const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./api/routes');
const { requestDuration } = require('./api/middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware
app.use(requestDuration);

// Routes
app.use('/api/v1', routes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

module.exports = app;