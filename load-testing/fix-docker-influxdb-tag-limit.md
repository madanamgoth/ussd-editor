# 🐳 Fix InfluxDB Tag Limit Error for Docker Setup

## 🚨 **Your Error with Docker InfluxDB:**
```
max-values-per-tag limit exceeded (100779/100000): measurement="http_reqs" tag="name"
```

Since you're using **InfluxDB in Docker**, the configuration approach is different.

---

## 🛠️ **SOLUTION 1: Docker Environment Variables (Easiest)**

### **Stop your current InfluxDB container:**
```bash
docker stop influxdb
docker rm influxdb
```

### **Restart InfluxDB with increased limits:**
```bash
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -e INFLUXDB_DATA_MAX_VALUES_PER_TAG=1000000 \
  -e INFLUXDB_DATA_MAX_SERIES_PER_DATABASE=10000000 \
  -v influxdb-storage:/var/lib/influxdb \
  influxdb:1.8
```

### **Or if using InfluxDB 2.x:**
```bash
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -e INFLUXD_ENGINE_MAX_SERIES_PER_DATABASE=10000000 \
  -e INFLUXD_DATA_MAX_VALUES_PER_TAG=1000000 \
  -v influxdb-storage:/var/lib/influxdb2 \
  influxdb:2.7
```

---

## 🛠️ **SOLUTION 2: Docker-Compose with Config**

### **Create influxdb.conf file:**
```bash
# Create config directory
mkdir -p ~/influxdb-config

# Create config file
cat > ~/influxdb-config/influxdb.conf << 'EOF'
[meta]
  dir = "/var/lib/influxdb/meta"

[data]
  dir = "/var/lib/influxdb/data"
  wal-dir = "/var/lib/influxdb/wal"
  max-values-per-tag = 1000000
  max-series-per-database = 10000000

[coordinator]

[retention]

[shard-precreation]

[monitor]

[http]
  enabled = true
  bind-address = ":8086"

[logging]

[subscriber]

[[graphite]]

[[collectd]]

[[opentsdb]]

[[udp]]

[continuous_queries]
EOF
```

### **Run InfluxDB with custom config:**
```bash
docker stop influxdb
docker rm influxdb

docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -v ~/influxdb-config/influxdb.conf:/etc/influxdb/influxdb.conf:ro \
  -v influxdb-storage:/var/lib/influxdb \
  influxdb:1.8 \
  -config /etc/influxdb/influxdb.conf
```

---

## 🛠️ **SOLUTION 3: Quick Docker Restart with Limits**

### **If you just want a quick fix:**
```bash
# Stop current InfluxDB
docker stop influxdb
docker rm influxdb

# Start with increased limits (InfluxDB 1.8)
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -e INFLUXDB_DATA_MAX_VALUES_PER_TAG=1000000 \
  -v influxdb-storage:/var/lib/influxdb \
  influxdb:1.8
```

### **Wait for InfluxDB to start:**
```bash
# Check if InfluxDB is ready
curl http://localhost:8086/ping

# Recreate your k6 database
curl -POST 'http://localhost:8086/query' --data-urlencode "q=CREATE DATABASE k6"
```

---

## 🛠️ **SOLUTION 4: Alternative - Use JSON Output Instead**

### **If you don't want to restart InfluxDB right now:**
```bash
# Use JSON output instead of InfluxDB for this test
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --summary-export=/loadtest/summary-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## ✅ **RECOMMENDED QUICK ACTION:**

**Option A (Restart InfluxDB with higher limits):**
```bash
# 1. Stop current InfluxDB
docker stop influxdb
docker rm influxdb

# 2. Start with increased limits
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -e INFLUXDB_DATA_MAX_VALUES_PER_TAG=1000000 \
  -v influxdb-storage:/var/lib/influxdb \
  influxdb:1.8

# 3. Wait a moment for startup
sleep 10

# 4. Recreate k6 database
curl -POST 'http://localhost:8086/query' --data-urlencode "q=CREATE DATABASE k6"

# 5. Re-run your K6 test
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

**Option B (Use JSON for now, fix InfluxDB later):**
```bash
# Just run with JSON output
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## 🔍 **How to Check Your Current InfluxDB Setup:**

```bash
# Check if InfluxDB container is running
docker ps | grep influxdb

# Check InfluxDB logs for errors
docker logs influxdb

# Check InfluxDB version
curl http://localhost:8086/ping
```

---

## 📊 **After Fix - Your Original Command Will Work:**

Once you restart InfluxDB with higher limits, your original command will work perfectly:

```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

**Choose Option A to get real-time Grafana monitoring working!** 🚀📊
