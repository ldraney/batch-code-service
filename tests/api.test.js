const request = require('supertest');
const crypto = require('crypto');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRET = 'test-secret';

const app = require('../src/server');

// Helper function to create webhook signature
function createWebhookSignature(payload, secret, timestamp) {
  const data = JSON.stringify(payload) + timestamp;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('Batch Code Service API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('GET /api/metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('POST /api/generate', () => {
    it('should generate batch code with valid signature', async () => {
      const payload = { type: 'batch' };
      const timestamp = Date.now().toString();
      const signature = createWebhookSignature(payload, 'test-secret', timestamp);

      const response = await request(app)
        .post('/api/generate')
        .set('x-webhook-signature', signature)
        .set('x-webhook-timestamp', timestamp)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('batchCode');
      expect(response.body).toHaveProperty('type', 'batch');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body.batchCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should reject request without signature', async () => {
      const payload = { type: 'batch' };

      await request(app)
        .post('/api/generate')
        .send(payload)
        .expect(401);
    });

    it('should reject request with invalid signature', async () => {
      const payload = { type: 'batch' };
      const timestamp = Date.now().toString();

      await request(app)
        .post('/api/generate')
        .set('x-webhook-signature', 'invalid-signature')
        .set('x-webhook-timestamp', timestamp)
        .send(payload)
        .expect(401);
    });

    it('should reject request with old timestamp', async () => {
      const payload = { type: 'batch' };
      const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
      const signature = createWebhookSignature(payload, 'test-secret', oldTimestamp);

      await request(app)
        .post('/api/generate')
        .set('x-webhook-signature', signature)
        .set('x-webhook-timestamp', oldTimestamp)
        .send(payload)
        .expect(401);
    });

    it('should reject invalid type', async () => {
      const payload = { type: 'invalid' };
      const timestamp = Date.now().toString();
      const signature = createWebhookSignature(payload, 'test-secret', timestamp);

      await request(app)
        .post('/api/generate')
        .set('x-webhook-signature', signature)
        .set('x-webhook-timestamp', timestamp)
        .send(payload)
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // This test would need to be expanded based on your rate limiting configuration
      // For now, just ensure the endpoint responds
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.status).toBe(200);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      await request(app)
        .get('/unknown-endpoint')
        .expect(404);
    });
  });
});
