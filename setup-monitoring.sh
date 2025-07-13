#!/bin/bash

# Setup script for batch-code-service monitoring configuration
echo "🔧 Setting up monitoring configuration..."

# Create directory structure
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/dashboards

# Create Prometheus configuration
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  # Batch Code Service
  - job_name: 'batch-code-service'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
    scrape_timeout: 5s

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  # cAdvisor (container metrics)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 15s
EOF

# Create Grafana datasource configuration
cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      httpMethod: POST
      manageAlerts: true
      prometheusType: Prometheus
      prometheusVersion: 2.40.0
      cacheLevel: 'High'
      disableRecordingRules: false
      incrementalQueryOverlapWindow: 10m
EOF

# Create Grafana dashboard provisioning
cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create Grafana dashboard JSON
cat > monitoring/grafana/dashboards/batch-code-service.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Batch Code Service Dashboard",
    "tags": ["batch-code", "webhook", "monitoring"],
    "style": "dark",
    "timezone": "browser",
    "refresh": "5s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Service Health Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"batch-code-service\"}",
            "legendFormat": "Service Up"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {
                  "color": "red",
                  "value": 0
                },
                {
                  "color": "green",
                  "value": 1
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 4,
          "w": 6,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"batch-code-service\"}[5m])",
            "legendFormat": "{{method}} {{route}} {{status_code}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 4
        }
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"batch-code-service\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"batch-code-service\"}[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 4
        }
      },
      {
        "id": 4,
        "title": "Batch Code Generation Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(batch_code_generation_total{job=\"batch-code-service\"}[5m])",
            "legendFormat": "{{status}}"
          }
        ],
        "yAxes": [
          {
            "label": "Codes/sec"
          }
        ],
        "gridPos": {
          "h": 6,
          "w": 12,
          "x": 0,
          "y": 12
        }
      },
      {
        "id": 5,
        "title": "Generation Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(batch_code_generation_duration_seconds_bucket{job=\"batch-code-service\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(batch_code_generation_duration_seconds_bucket{job=\"batch-code-service\"}[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Seconds"
          }
        ],
        "gridPos": {
          "h": 6,
          "w": 12,
          "x": 12,
          "y": 12
        }
      },
      {
        "id": 6,
        "title": "Cache Size",
        "type": "stat",
        "targets": [
          {
            "expr": "batch_code_cache_size{job=\"batch-code-service\"}",
            "legendFormat": "Cache Size"
          }
        ],
        "gridPos": {
          "h": 4,
          "w": 6,
          "x": 6,
          "y": 0
        }
      },
      {
        "id": 7,
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "active_connections{job=\"batch-code-service\"}",
            "legendFormat": "Active Connections"
          }
        ],
        "gridPos": {
          "h": 4,
          "w": 6,
          "x": 12,
          "y": 0
        }
      },
      {
        "id": 8,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"batch-code-service\"}",
            "legendFormat": "RSS Memory"
          },
          {
            "expr": "process_heap_bytes{job=\"batch-code-service\"}",
            "legendFormat": "Heap Memory"
          }
        ],
        "yAxes": [
          {
            "label": "Bytes"
          }
        ],
        "gridPos": {
          "h": 6,
          "w": 12,
          "x": 0,
          "y": 18
        }
      },
      {
        "id": 9,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"batch-code-service\",status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          },
          {
            "expr": "rate(http_requests_total{job=\"batch-code-service\",status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx Errors"
          }
        ],
        "yAxes": [
          {
            "label": "Errors/sec"
          }
        ],
        "gridPos": {
          "h": 6,
          "w": 12,
          "x": 12,
          "y": 18
        }
      }
    ]
  }
}
EOF

echo "✅ Monitoring configuration created successfully!"
echo ""
echo "📂 Created directories:"
echo "  - monitoring/prometheus/"
echo "  - monitoring/grafana/provisioning/datasources/"
echo "  - monitoring/grafana/provisioning/dashboards/"
echo "  - monitoring/grafana/dashboards/"
echo ""
echo "📄 Created files:"
echo "  - monitoring/prometheus/prometheus.yml"
echo "  - monitoring/grafana/provisioning/datasources/prometheus.yml"
echo "  - monitoring/grafana/provisioning/dashboards/dashboards.yml"
echo "  - monitoring/grafana/dashboards/batch-code-service.json"
echo ""
echo "🚀 You can now run: npm run docker:compose"
