const jwt = require('jsonwebtoken');
const { metrics } = require('../monitoring/metrics');

const authenticateRequest = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    metrics.errors.inc({ type: 'auth', code: 'missing_token' });
    return res.status(401).json({
      status: 'error',
      error: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    metrics.activeConnections.inc();
    next();
  } catch (error) {
    metrics.errors.inc({ type: 'auth', code: 'invalid_token' });
    res.status(401).json({
      status: 'error',
      error: 'Invalid authentication token'
    });
  }
};

module.exports = { authenticateRequest };