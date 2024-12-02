const prometheus = require('prom-client');
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const metrics = {
  requestDuration: new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),

  rateLimitHits: new prometheus.Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['status']
  }),

  documentProcessingDuration: new prometheus.Histogram({
    name: 'document_processing_duration_seconds',
    help: 'Duration of document processing in seconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 30, 60]
  }),

  uploadSize: new prometheus.Histogram({
    name: 'upload_size_bytes',
    help: 'Size of uploaded documents in bytes',
    buckets: [1000, 10000, 100000, 1000000]
  }),

  errors: new prometheus.Counter({
    name: 'error_total',
    help: 'Total number of errors',
    labelNames: ['type', 'code']
  }),

  activeConnections: new prometheus.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
  }),

  cacheHits: new prometheus.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  }),

  cacheMisses: new prometheus.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  })
};

Object.values(metrics).forEach(metric => register.registerMetric(metric));

module.exports = { metrics, register };