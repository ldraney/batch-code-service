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
git clone https://github.com/ldraney/batch-code-service.git
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
```

## 📋 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate new batch code |
| `/api/health` | GET | Health check |
| `/api/metrics` | GET | Prometheus metrics |

## 🔧 Tech Stack

- **Runtime**: Node.js + Express
- **Core Logic**: Bash scripts (reliable, AI-friendly)
- **Monitoring**: Prometheus + Grafana + Sentry
- **Deployment**: Docker + Fly.io
- **Testing**: Jest + simple integration tests

## 🏗️ Architecture

```
┌─ Webhook Request ─┐
│                   │
├─ Express Server ──┤
│                   │
├─ Bash Generator ──┤ ─── Metrics ──┐
│                   │               │
├─ Response ────────┘               ├─ Prometheus
                                    │
                                    ├─ Grafana  
                                    │
                                    └─ Sentry
```

## 🚢 Deployment

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status
fly logs
```

## 📊 Monitoring

- **Grafana**: http://localhost:3001 (local)
- **Prometheus**: http://localhost:9090 (local) 
- **Sentry**: Configure with your DSN in .env.local

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally: `npm test`
5. Submit a pull request

## 📄 License

MIT License
