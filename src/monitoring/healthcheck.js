const os = require('os');
const Redis = require('ioredis');

class HealthCheck {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async check() {
    const checks = {
      uptime: this._checkUptime(),
      memory: this._checkMemory(),
      redis: await this._checkRedis(),
      system: this._checkSystem()
    };

    const status = Object.values(checks).every(check => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks
    };
  }

  _checkUptime() {
    const uptime = process.uptime();
    return {
      status: 'healthy',
      uptime: uptime,
      formattedUptime: this._formatUptime(uptime)
    };
  }

  _checkMemory() {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    const usagePercent = ((total - free) / total) * 100;

    return {
      status: usagePercent < 90 ? 'healthy' : 'warning',
      heap: used.heapUsed,
      total: total,
      free: free,
      usagePercent: usagePercent.toFixed(2)
    };
  }

  async _checkRedis() {
    try {
      const ping = await this.redis.ping();
      return {
        status: ping === 'PONG' ? 'healthy' : 'unhealthy',
        latency: await this._checkRedisLatency()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async _checkRedisLatency() {
    const start = process.hrtime();
    await this.redis.ping();
    const [seconds, nanoseconds] = process.hrtime(start);
    return (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
  }

  _checkSystem() {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPercent = (loadAvg[0] / cpuCount) * 100;

    return {
      status: loadPercent < 80 ? 'healthy' : 'warning',
      load: loadAvg[0].toFixed(2),
      cpuCount,
      loadPercent: loadPercent.toFixed(2)
    };
  }

  _formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}

module.exports = new HealthCheck();