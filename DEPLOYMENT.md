# 🚀 Deployment Guide

This guide covers deploying the Batch Code Service to production and setting up local development.

## 📋 Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Fly.io CLI (for production deployment)
- Git

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/batch-code-service.git
cd batch-code-service
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your settings
nano .env.local
```

Required environment variables:
- `WEBHOOK_SECRET`: Strong secret for webhook signature verification
- `SENTRY_DSN`: (Optional) For error tracking

### 3. Run Locally

**Option A: Node.js directly**
```bash
npm run dev
```

**Option B: Docker Compose (Recommended)**
```bash
# Start full monitoring stack
npm run docker:compose

# View logs
docker-compose logs -f app
```

### 4. Test the Service

```bash
# Health check
curl http://localhost:3000/api/health

# Generate batch code (requires signature)
npm run test
```

### 5. Access Monitoring

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **App Metrics**: http://localhost:3000/api/metrics

## ☁️ Production Deployment (Fly.io)

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux/Windows
curl -L https://fly.io/install.sh | sh
```

### 2. Setup Fly.io App

```bash
# Login to Fly.io
fly auth login

# Create app (modify fly.toml first)
fly apps create batch-code-service

# Set secrets
fly secrets set WEBHOOK_SECRET="your-production-secret"
fly secrets set SENTRY_DSN="your-sentry-dsn"
```

### 3. Deploy

```bash
# Deploy application
fly deploy

# Check status
fly status
fly logs

# Scale if needed
fly scale count 2
```

### 4. Custom Domain (Optional)

```bash
# Add custom domain
fly certs add yourdomain.com

# Check certificate status
fly certs show yourdomain.com
```

## 🐳 Docker Deployment

### Build and Push

```bash
# Build image
docker build -t batch-code-service .

# Tag for registry
docker tag batch-code-service:latest your-registry/batch-code-service:latest

# Push to registry
docker push your-registry/batch-code-service:latest
```

### Run in Production

```bash
# Run with environment variables
docker run -d \
  --name batch-code-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e WEBHOOK_SECRET=your-secret \
  -e SENTRY_DSN=your-dsn \
  your-registry/batch-code-service:latest
```

## 📊 Monitoring Setup

### Sentry Configuration

1. Create account at [sentry.io](https://sentry.io)
2. Create new project
3. Copy DSN to environment variables
4. Deploy with Sentry DSN configured

### Prometheus + Grafana

**Local Development:**
- Automatically configured with Docker Compose
- Access Grafana at http://localhost:3001

**Production:**
1. Deploy Prometheus server
2. Configure scraping of your app's `/api/metrics` endpoint
3. Import provided dashboard configuration
4. Set up alerting rules

### Health Monitoring

The service provides comprehensive health checks at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "responseTime": 45,
  "checks": {
    "bashScript": { "status": "healthy" },
    "systemResources": { "status": "healthy" },
    "batchGeneration": { "status": "healthy" },
    "environment": { "status": "healthy" }
  }
}
```

## 🔐 Security Considerations

### Webhook Signature Verification

All requests to `/api/generate` require HMAC-SHA256 signature:

```javascript
// Generate signature
const crypto = require('crypto');
const payload = JSON.stringify(body) + timestamp;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

// Include in headers
headers['x-webhook-signature'] = signature;
headers['x-webhook-timestamp'] = timestamp;
```

### Environment Security

- Use strong `WEBHOOK_SECRET` (32+ characters)
- Never commit secrets to repository
- Use Fly.io secrets or equivalent for production
- Enable HTTPS (automatic with Fly.io)

### Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Adjust in environment variables if needed
- Monitor metrics for abuse patterns

## 🔍 Troubleshooting

### Common Issues

**1. Bash Script Not Executable**
```bash
chmod +x scripts/generate-batch-code.sh
```

**2. Docker Permission Issues**
```bash
# Fix ownership
sudo chown -R $USER:$USER .
```

**3. Fly.io Deployment Fails**
```bash
# Check logs
fly logs

# Restart app
fly apps restart batch-code-service
```

**4. Health Check Failing**
```bash
# Test locally first
curl http://localhost:3000/api/health

# Check bash script
./scripts/generate-batch-code.sh
```

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
npm start
```

### Monitoring Issues

**Prometheus not scraping:**
- Check `/api/metrics` endpoint accessibility
- Verify prometheus.yml configuration
- Check network connectivity

**Grafana dashboard empty:**
- Verify Prometheus data source configuration
- Check if metrics are being collected
- Ensure time range is appropriate

## 📈 Performance Tuning

### Memory Usage
- Default: 512MB (Fly.io)
- Monitor via Grafana dashboards
- Scale up if memory usage > 80%

### Request Handling
- Current: 25 concurrent connections
- Adjust in fly.toml if needed
- Monitor active connections metric

### Bash Script Optimization
- Script executes in <10ms typically
- Monitor generation_duration_seconds metric
- Cache size automatically managed

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)

For questions or issues, check the troubleshooting section or create an issue in the repository.
