const jwt = require('jsonwebtoken');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const metrics = require('../../monitoring/metrics');

const validateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    metrics.authenticationSuccess.inc();
    next();
  } catch (error) {
    logger.warn('Authentication failed:', { error: error.message });
    metrics.authenticationFailure.inc();
    next(createError(401, 'Authentication failed'));
  }
};

module.exports = { validateToken };