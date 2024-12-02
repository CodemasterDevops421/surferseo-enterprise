const RateLimiter = require('../../core/RateLimiter');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const metrics = require('../../monitoring/metrics');

const limiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 30
});

const rateLimit = async (req, res, next) => {
  try {
    const key = req.user.id;
    const result = await limiter.checkLimit(key);

    if (!result.allowed) {
      metrics.rateLimitHits.inc({ status: 'blocked' });
      logger.warn('Rate limit exceeded:', { userId: key });
      throw createError(429, 'Rate limit exceeded');
    }

    metrics.rateLimitHits.inc({ status: 'allowed' });
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    
    next();
  } catch (error) {
    if (error.status === 429) {
      next(error);
    } else {
      logger.error('Rate limiter error:', error);
      next(createError(500, 'Internal rate limiter error'));
    }
  }
};

module.exports = { rateLimit };