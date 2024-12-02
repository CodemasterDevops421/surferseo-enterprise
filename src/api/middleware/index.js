const RateLimiter = require('../../core/RateLimiter');
const jwt = require('jsonwebtoken');
const metrics = require('../../monitoring/metrics');

const limiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 100
});

exports.rateLimiter = async (req, res, next) => {
  const key = req.user ? req.user.id : req.ip;
  
  try {
    const result = await limiter.checkLimit(key);
    
    if (!result.allowed) {
      metrics.rateLimitHits.inc({ status: 'blocked' });
      return res.status(429).json({
        status: 'error',
        message: 'Rate limit exceeded',
        resetTime: result.resetTime
      });
    }

    metrics.rateLimitHits.inc({ status: 'allowed' });
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next();
  }
};

exports.validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key required'
    });
  }

  try {
    const decoded = jwt.verify(apiKey, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }
};

// Request duration middleware
exports.requestDuration = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    metrics.requestDuration.observe({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    }, durationInSeconds);
  });

  next();
};