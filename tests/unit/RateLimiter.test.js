const RateLimiter = require('../../src/core/RateLimiter');
const Redis = require('ioredis-mock');

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 2
    });
  });

  afterEach(async () => {
    await rateLimiter.shutdown();
  });

  it('should allow requests within limit', async () => {
    const result1 = await rateLimiter.checkLimit('test-user');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);
  });

  it('should block requests over limit', async () => {
    await rateLimiter.checkLimit('test-user');
    await rateLimiter.checkLimit('test-user');
    const result = await rateLimiter.checkLimit('test-user');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    jest.spyOn(Redis.prototype, 'multi').mockImplementation(() => {
      throw new Error('Redis error');
    });

    const result = await rateLimiter.checkLimit('test-user');
    expect(result.allowed).toBe(true);
    expect(result.fallback).toBe(true);
  });
});