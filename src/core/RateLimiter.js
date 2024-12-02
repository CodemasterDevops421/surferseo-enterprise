const Redis = require('ioredis');
const winston = require('winston');
const { createHash } = require('crypto');

class RateLimiter {
  constructor(options = {}) {
    this.redis = new Redis(options.redisUrl || process.env.REDIS_URL);
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 30;
    this.logger = this._initializeLogger();
  }

  _initializeLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'rate-limiter' },
      transports: [
        new winston.transports.File({ filename: 'logs/rate-limiter-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/rate-limiter.log' })
      ]
    });
  }

  async checkLimit(key, tier = 'default') {
    const identifier = this._generateKey(key, tier);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      const multi = this.redis.multi();
      multi.zremrangebyscore(identifier, 0, windowStart);
      multi.zadd(identifier, now, `${now}-${Math.random()}`);
      multi.zcard(identifier);
      multi.pexpire(identifier, this.windowMs);

      const results = await multi.exec();
      const requestCount = results[2][1];

      const remaining = Math.max(0, this.maxRequests - requestCount);
      const resetTime = windowStart + this.windowMs;

      this._logRequest(identifier, requestCount, remaining);

      return {
        allowed: requestCount <= this.maxRequests,
        remaining,
        resetTime,
        limit: this.maxRequests
      };
    } catch (error) {
      this._handleError(error, identifier);
      return this._fallbackResponse(windowStart);
    }
  }

  _generateKey(key, tier) {
    const hash = createHash('sha256')
      .update(`${key}:${tier}`)
      .digest('hex');
    return `ratelimit:${hash}`;
  }

  _logRequest(identifier, count, remaining) {
    this.logger.info({
      message: 'Rate limit check',
      identifier,
      count,
      remaining,
      timestamp: new Date().toISOString()
    });
  }

  _handleError(error, identifier) {
    this.logger.error({
      message: 'Rate limiter error',
      error: error.message,
      stack: error.stack,
      identifier,
      timestamp: new Date().toISOString()
    });
  }

  _fallbackResponse(windowStart) {
    return {
      allowed: true,
      remaining: 1,
      resetTime: windowStart + this.windowMs,
      limit: this.maxRequests,
      fallback: true
    };
  }

  async shutdown() {
    await this.redis.quit();
  }
}

module.exports = RateLimiter;