# K6 Direct to Grafana (No InfluxDB) - Complete Guide

## 🚀 **Method 1: K6 → Prometheus → Grafana (Recommended)**

### **Step 1: Run K6 with Prometheus Output**
```bash
# Direct Prometheus output (no InfluxDB needed)
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  --tag version=v2.0 \
  /loadtest/ussd-load-test-enhanced.js
```

### **Step 2: Setup Prometheus (if not already running)**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

remote_write:
  - url: http://localhost:9090/api/v1/write

scrape_configs:
  - job_name: 'k6'
    static_configs:
      - targets: ['localhost:6565']  # K6 metrics endpoint
```

### **Step 3: Grafana Data Source**
```
Data Source Type: Prometheus
URL: http://127.0.0.1:9090
Access: Server (default)
```

---

## 🎯 **Method 2: K6 → Grafana Cloud (Easiest)**

### **Setup Grafana Cloud**
```bash
# Get free Grafana Cloud account at grafana.com
# Get your Prometheus endpoint and API key

# Run K6 with Grafana Cloud
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  -e K6_PROMETHEUS_RW_SERVER_URL=https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push \
  -e K6_PROMETHEUS_RW_USERNAME=your-username \
  -e K6_PROMETHEUS_RW_PASSWORD=your-api-key \
  grafana/k6 run \
  --out experimental-prometheus-rw \
  /loadtest/ussd-load-test-enhanced.js
```

---

## 🎯 **Method 3: K6 → Loki → Grafana (Log-based)**

### **Step 1: Setup Loki**
```yaml
# docker-compose.yml for Loki
version: '3'
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### **Step 2: K6 with JSON to Loki**
```bash
# Run K6 with JSON output
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-results.json \
  /loadtest/ussd-load-test-enhanced.js

# Send logs to Loki using Promtail or curl
curl -X POST "http://127.0.0.1:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d @k6-results.json
```

---

## 🎯 **Method 4: K6 → CSV → Grafana CSV Plugin**

### **Step 1: Generate CSV Output**
```bash
# Run K6 with custom CSV output
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-results.json \
  /loadtest/ussd-load-test-enhanced.js

# Convert JSON to CSV
python3 json-to-csv-converter.py k6-results.json
```

### **Step 2: Install Grafana CSV Plugin**
```bash
# Install CSV datasource plugin
grafana-cli plugins install marcusolsson-csv-datasource

# Restart Grafana
sudo systemctl restart grafana-server
```

### **Step 3: Add CSV Data Source**
```
Data Source Type: CSV
URL: file:///path/to/your/k6-results.csv
```

---

## 🎯 **Method 5: K6 → Direct HTTP → Grafana (Custom)**

### **Custom K6 Output Script**
```javascript
// In your K6 script - send directly to Grafana API
import { check } from 'k6';
import http from 'k6/http';

export function setup() {
  // Initialize Grafana data
  return { grafanaUrl: 'http://127.0.0.1:3000' };
}

export default function(data) {
  // Your normal K6 test code here
  
  // Send metrics directly to Grafana API
  const metric = {
    timestamp: Date.now(),
    value: response.timings.duration,
    tags: {
      scenario: __ENV.SCENARIO_NAME,
      step: 'login'
    }
  };
  
  // Send to custom Grafana webhook/API
  http.post(`${data.grafanaUrl}/api/custom/metrics`, JSON.stringify(metric));
}
```

---

## 🎯 **Method 6: K6 → Elasticsearch → Grafana**

### **Step 1: Setup Elasticsearch**
```bash
# Start Elasticsearch
docker run -d --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  elasticsearch:7.17.0
```

### **Step 2: K6 to Elasticsearch**
```bash
# Custom output to Elasticsearch
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-results.json \
  /loadtest/ussd-load-test-enhanced.js

# Index to Elasticsearch
curl -X POST "127.0.0.1:9200/k6-results/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @k6-results-elastic.json
```

### **Step 3: Grafana Elasticsearch Data Source**
```
Data Source Type: Elasticsearch
URL: http://127.0.0.1:9200
Index name: k6-results
Time field name: @timestamp
```

---

## 🏆 **RECOMMENDED: Direct Prometheus Approach**

### **Complete Setup Script**
```bash
#!/bin/bash

echo "🚀 Setting up K6 → Prometheus → Grafana (No InfluxDB)"

# Step 1: Start Prometheus
docker run -d --name prometheus \
  -p 9090:9090 \
  -v /home/mobiquity/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Step 2: Start Grafana
docker run -d --name grafana \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Step 3: Run K6 with Prometheus output
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  /loadtest/ussd-load-test-enhanced.js

echo "✅ Setup complete!"
echo "📊 Grafana: http://127.0.0.1:3000 (admin/admin)"
echo "📈 Prometheus: http://127.0.0.1:9090"
```

---

## 🎯 **Grafana Queries for Prometheus Data**

### **Response Time**
```promql
rate(k6_http_req_duration_sum[5m]) / rate(k6_http_req_duration_count[5m])
```

### **Request Rate (TPS)**
```promql
rate(k6_http_reqs_total[5m])
```

### **Error Rate**
```promql
rate(k6_http_req_failed_total[5m]) / rate(k6_http_reqs_total[5m]) * 100
```

### **Virtual Users**
```promql
k6_vus
```

---

## 🎯 **Simplest Option: Grafana Cloud**

### **1. Sign up for free Grafana Cloud**
- Go to grafana.com
- Get free account (14 days, then free tier available)
- Get your Prometheus endpoint URL and API key

### **2. Run K6 with single command**
```bash
export K6_PROMETHEUS_RW_SERVER_URL="https://prometheus-prod-xx-prod-us-central-0.grafana.net/api/prom/push"
export K6_PROMETHEUS_RW_USERNAME="your-username"
export K6_PROMETHEUS_RW_PASSWORD="your-api-key"

sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  -e K6_PROMETHEUS_RW_SERVER_URL \
  -e K6_PROMETHEUS_RW_USERNAME \
  -e K6_PROMETHEUS_RW_PASSWORD \
  grafana/k6 run \
  --out experimental-prometheus-rw \
  /loadtest/ussd-load-test-enhanced.js
```

### **3. View in Grafana Cloud**
- Instant dashboards
- No setup required
- Pre-built K6 dashboards available

---

## 🏆 **My Recommendation**

**For simplicity**: Use **Grafana Cloud** (free tier)
**For control**: Use **Prometheus locally** 
**For advanced**: Use **Elasticsearch** approach

All of these completely eliminate the need for InfluxDB while giving you excellent visualization in Grafana! 🎯
