const Redis = require('ioredis');
const { promisify } = require('util');
const winston = require('winston');

class RateLimiter {
    constructor(options = {}) {
        this.redis = new Redis(options.redisUrl || process.env.REDIS_URL);
        this.windowMs = options.windowMs || 60000; // 1 minute default
        this.maxRequests = options.maxRequests || 30; // 30 requests per window default
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'rate-limiter.log' })
            ]
        });
    }

    async checkLimit(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        try {
            const multi = this.redis.multi();
            multi.zremrangebyscore(key, 0, windowStart);
            multi.zadd(key, now, `${now}-${Math.random()}`);
            multi.zcard(key);
            multi.pexpire(key, this.windowMs);

            const results = await multi.exec();
            const requestCount = results[2][1];

            if (requestCount > this.maxRequests) {
                this.logger.warn({
                    message: 'Rate limit exceeded',
                    key,
                    requestCount,
                    maxRequests: this.maxRequests
                });
                return {
                    allowed: false,
                    remainingRequests: 0,
                    resetTime: windowStart + this.windowMs
                };
            }

            return {
                allowed: true,
                remainingRequests: this.maxRequests - requestCount,
                resetTime: windowStart + this.windowMs
            };
        } catch (error) {
            this.logger.error({
                message: 'Rate limiter error',
                error: error.message,
                stack: error.stack
            });
            // Fail open in production to prevent API downtime
            return {
                allowed: true,
                remainingRequests: 1,
                resetTime: windowStart + this.windowMs,
                error: 'Rate limiter error'
            };
        }
    }

    async shutdown() {
        await this.redis.quit();
    }
}

module.exports = RateLimiter;