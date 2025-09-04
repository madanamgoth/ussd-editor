# 🐧 K6 Data Visualization on Linux Server

## 🎯 Where Your K6 Data Goes to Grafana

Your K6 test results can be visualized in **4 different ways** on Linux:

### **Option 1: Real-time Prometheus → Grafana (RECOMMENDED)** ⭐

```bash
# 1. Run the setup script
chmod +x setup-k6-grafana-linux.sh
./setup-k6-grafana-linux.sh

# 2. Select option 1 (Prometheus + Grafana)

# 3. Your data flows like this:
K6 Test → Prometheus → Grafana Dashboard
```

**Data Flow:**
- ✅ **K6** sends metrics directly to **Prometheus** (real-time)
- ✅ **Grafana** reads from **Prometheus** (live updates)
- ✅ **No files needed** - everything is live!

**Access:**
- 📊 Grafana: `http://your-server-ip:3000` (admin/admin)
- 📈 Prometheus: `http://your-server-ip:9090`

---

### **Option 2: JSON → CSV → Grafana CSV Plugin** 📄

```bash
# 1. Run K6 with JSON output
docker run --rm -v /loadtest:/loadtest grafana/k6 run \
    --out json=/loadtest/results.json \
    /loadtest/ussd-load-test-enhanced.js

# 2. Convert JSON to CSV
python3 json-to-csv-converter.py results.json

# 3. Load CSV files into Grafana
```

**Data Flow:**
- ✅ **K6** → JSON file
- ✅ **Python script** → CSV files  
- ✅ **Grafana CSV plugin** → Dashboard

---

### **Option 3: InfluxDB → Grafana (Traditional)** 💾

```bash
# K6 sends data directly to InfluxDB
docker run --rm --network host grafana/k6 run \
    --out influxdb=http://localhost:8086/k6 \
    /loadtest/ussd-load-test-enhanced.js
```

**Data Flow:**
- ✅ **K6** → InfluxDB database
- ✅ **Grafana** → Reads from InfluxDB

---

### **Option 4: Grafana Cloud** ☁️

```bash
# K6 sends directly to Grafana Cloud
docker run --rm grafana/k6 run \
    --out experimental-prometheus-rw \
    -e K6_PROMETHEUS_RW_SERVER_URL="your-cloud-url" \
    /loadtest/ussd-load-test-enhanced.js
```

## 🚀 **QUICK START (Recommended)**

### **1-Command Setup:**

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/your-repo/setup-k6-grafana-linux.sh
chmod +x setup-k6-grafana-linux.sh
./setup-k6-grafana-linux.sh
```

### **Manual Prometheus Setup:**

```bash
# 1. Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
    command: ["--web.enable-remote-write-receiver"]
  
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment: ["GF_SECURITY_ADMIN_PASSWORD=admin"]
EOF

# 2. Create Prometheus config
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
EOF

# 3. Start services
docker-compose up -d

# 4. Run K6 test
docker run --rm --network host -v $(pwd):/loadtest grafana/k6 run \
    --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
    /loadtest/ussd-load-test-enhanced.js
```

## 📊 **Your Metrics in Grafana Will Show:**

### **Performance Metrics:**
- 📈 **Virtual Users (VUs)**: 1 → 50 over time
- ⚡ **TPS (Transactions/sec)**: 9.66 req/sec
- ⏱️ **Response Times**: P95 = 198.82ms
- ❌ **Error Rate**: 0.00%
- ✅ **Success Rate**: 100%

### **Business Metrics:**
- 💰 **Session Value**: $10-$5000 range
- ⏰ **Session Duration**: 3-10 seconds
- 🎯 **Flow Completion**: 100%
- 📱 **User Abandonment**: 0%

### **Technical Metrics:**
- 🌐 **HTTP Requests**: 4,725 total
- 📊 **Data Transfer**: 734KB received, 931KB sent
- 🔄 **Iterations**: 1,001 complete user journeys

## 🎯 **Best Practice:**

**Use Option 1 (Prometheus)** because:
- ✅ Real-time data (no file processing)
- ✅ No storage management needed
- ✅ Built-in K6 support
- ✅ Industry standard
- ✅ Scales well

## 📱 **Access Your Dashboard:**

After setup, go to:
```
http://your-linux-server-ip:3000
Username: admin
Password: admin
```

Import K6 dashboard: **Dashboard ID 2587**

Your data will automatically appear with all the metrics from your test results! 🚀
