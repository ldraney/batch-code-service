const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Initialize Sentry before importing other modules
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  const { ProfilingIntegration } = require('@sentry/profiling-node');
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

const { generateBatchCode } = require('./generator');
const { metricsMiddleware, register } = require('./metrics');
const { healthCheck } = require('./health');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-secret-change-me';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Add Sentry request handler if Sentry is configured
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Webhook signature verification middleware
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'] || Date.now().toString();
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // Create expected signature
  const payload = JSON.stringify(req.body) + timestamp;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Verify signature
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  const reqTime = parseInt(timestamp);
  if (Math.abs(now - reqTime) > 5 * 60 * 1000) { // 5 minutes tolerance
    return res.status(401).json({ error: 'Request timestamp too old' });
  }

  next();
};

// Routes
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

app.get('/api/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

app.post('/api/generate', verifyWebhookSignature, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { type = 'batch' } = req.body;
    
    if (type !== 'batch') {
      return res.status(400).json({ 
        error: 'Invalid type. Only "batch" is supported.' 
      });
    }

    const batchCode = await generateBatchCode();
    const generationTime = Date.now() - startTime;

    console.log(`Generated batch code: ${batchCode} (${generationTime}ms)`);

    res.json({
      batchCode,
      type,
      generatedAt: new Date().toISOString(),
      generationTime
    });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error('Batch code generation failed:', error);
    
    res.status(500).json({
      error: 'Failed to generate batch code',
      generationTime
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Batch Code Service running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
});

module.exports = app;
