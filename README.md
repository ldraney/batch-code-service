# 🏷️ Batch Code Service

A minimal, production-ready batch code generator with webhook API and comprehensive monitoring.

## 🎯 Purpose

Generate unique 6-digit alphanumeric batch codes via webhook with full observability for debugging and monitoring.

## ✨ Features

- 🔗 **Simple Webhook API** - Single endpoint for batch code generation
- 📊 **Full Observability** - Prometheus metrics + Grafana dashboards + Sentry error tracking  
- 🐳 **Docker Ready** - Complete containerized environment
- ☁️ **Fly.io Deployment** - Production cloud deployment
- 🛡️ **Health Monitoring** - Comprehensive health checks and alerts
- ⚡ **Bash Core** - Reliable batch code generation using proven bash scripts

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/batch-code-service.git
cd batch-code-service

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings

# Run locally
npm install
npm run dev

# Test the API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: your-secret" \
  -d '{"type": "batch"}'
