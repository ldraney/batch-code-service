const client = require('prom-client');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'batch-code-service'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const batchCodeGenerationDuration = new client.Histogram({
  name: 'batch_code_generation_duration_seconds',
  help: 'Duration of batch code generation in seconds',
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const batchCodeGenerationTotal = new client.Counter({
  name: 'batch_code_generation_total',
  help: 'Total number of batch codes generated',
  labelNames: ['status'] // success, error, duplicate
});

const bashScriptExecutionDuration = new client.Histogram({
  name: 'bash_script_execution_duration_seconds',
  help: 'Duration of bash script execution in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const webhookSignatureVerificationTotal = new client.Counter({
  name: 'webhook_signature_verification_total',
  help: 'Total number of webhook signature verifications',
  labelNames: ['status'] // valid, invalid, missing
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const cacheSize = new client.Gauge({
  name: 'batch_code_cache_size',
  help: 'Current size of the batch code cache'
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(batchCodeGenerationDuration);
register.registerMetric(batchCodeGenerationTotal);
register.registerMetric(bashScriptExecutionDuration);
register.registerMetric(webhookSignatureVerificationTotal);
register.registerMetric(activeConnections);
register.registerMetric(cacheSize);

// Middleware to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Increment active connections
  activeConnections.inc();

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000;
    const route = getRoutePattern(req.path);
    
    // Record metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
      
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    // Decrement active connections
    activeConnections.dec();
    
    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

// Helper function to get route pattern from path
function getRoutePattern(path) {
  if (path === '/api/health') return '/api/health';
  if (path === '/api/metrics') return '/api/metrics';
  if (path === '/api/generate') return '/api/generate';
  if (path.startsWith('/api/')) return '/api/*';
  return 'other';
}

// Metrics helper functions
const metrics = {
  recordBatchCodeGeneration: (duration, status = 'success') => {
    batchCodeGenerationDuration.observe(duration);
    batchCodeGenerationTotal.labels(status).inc();
  },

  recordBashScriptExecution: (duration) => {
    bashScriptExecutionDuration.observe(duration);
  },

  recordWebhookVerification: (status) => {
    webhookSignatureVerificationTotal.labels(status).inc();
  },

  updateCacheSize: (size) => {
    cacheSize.set(size);
  },

  // Get current metric values for health checks
  getCurrentMetrics: async () => {
    const metricsString = await register.metrics();
    return {
      totalRequests: httpRequestTotal._hashMap ? Object.keys(httpRequestTotal._hashMap).length : 0,
      activeConnections: activeConnections._getValue ? activeConnections._getValue() : 0,
      cacheSize: cacheSize._getValue ? cacheSize._getValue() : 0
    };
  }
};

module.exports = {
  register,
  metricsMiddleware,
  metrics
};
