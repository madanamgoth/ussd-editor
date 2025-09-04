# 🐳 Updated Docker K6 Commands for InfluxDB Integration

## 🔄 **YOUR CURRENT COMMAND:**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest grafana/k6 run /loadtest/ussd-load-test-1756881987993_m.js
```

## 🚀 **UPDATED COMMANDS FOR INFLUXDB:**

### **✅ Basic InfluxDB Output (Recommended)**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  /loadtest/ussd-load-test-1756881987993_m.js
```

### **🎯 Enhanced with Tags & Multiple Outputs**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_docker_$(date +%Y%m%d_%H%M%S) \
  --tag environment=production \
  --tag version=v1.0 \
  /loadtest/ussd-load-test-1756881987993_m.js
```

### **🔧 With Summary Export**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --summary-export=/loadtest/summary-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_docker_$(date +%Y%m%d_%H%M%S) \
  --tag environment=production \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## 🎯 **WHAT CHANGED:**

### **✅ Added InfluxDB Output:**
- `--out influxdb=http://localhost:8086/k6`
- This pushes **all metrics** to your InfluxDB in real-time

### **✅ Added Tags for Better Filtering:**
- `--tag testid=ussd_docker_$(date +%Y%m%d_%H%M%S)` - Unique test identifier
- `--tag environment=production` - Environment identification
- `--tag version=v1.0` - Version tracking

### **✅ Added File Outputs:**
- `--out json=/loadtest/results-$(date).json` - Detailed JSON results
- `--summary-export=/loadtest/summary-$(date).json` - High-level summary

---

## 🔧 **NETWORK CONSIDERATIONS:**

Since you're using `--network host`, the container can directly access:
- ✅ **InfluxDB**: `http://localhost:8086`
- ✅ **Your USSD service**: Same as your current setup
- ✅ **File system**: `/home/mobiquity/loadtest` mounted as `/loadtest`

---

## 📊 **WHAT YOU'LL GET:**

### **Real-time in InfluxDB/Grafana:**
- HTTP request rates and response times
- Your custom USSD flow metrics
- Session completion rates
- Step-by-step performance
- Business transaction metrics

### **Files in `/home/mobiquity/loadtest/`:**
- `results-YYYYMMDD_HHMMSS.json` - Complete test data
- `summary-YYYYMMDD_HHMMSS.json` - Summary metrics

---

## 🚀 **READY-TO-USE COMMANDS:**

### **🥇 Recommended (Basic InfluxDB):**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  /loadtest/ussd-load-test-1756881987993_m.js
```

### **🥈 Full Featured (InfluxDB + Files + Tags):**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_docker_$(date +%Y%m%d_%H%M%S) \
  --tag environment=production \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## 🔍 **VERIFICATION:**

After running, check:

### **1. InfluxDB Data:**
```bash
# Check if data is flowing
curl -G 'http://localhost:8086/query' \
  --data-urlencode "db=k6" \
  --data-urlencode "q=SELECT COUNT(*) FROM http_reqs WHERE time > now() - 5m"
```

### **2. Grafana Dashboard:**
- Open: http://localhost:3000
- Go to your K6 dashboard
- Should see real-time metrics flowing in

### **3. Generated Files:**
```bash
ls -la /home/mobiquity/loadtest/results-*.json
ls -la /home/mobiquity/loadtest/summary-*.json
```

---

## ⚡ **QUICK START:**

**Just copy and run this enhanced command:**

```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

**Then open Grafana to watch your real-time USSD load test metrics!** 📊🚀
