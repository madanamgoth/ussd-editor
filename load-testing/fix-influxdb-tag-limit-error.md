# 🔧 Fix for InfluxDB Tag Limit Error

## 🚨 **ERROR EXPLANATION:**
```
max-values-per-tag limit exceeded (100779/100000): measurement="http_reqs" tag="name"
```

**Problem**: Each K6 HTTP request creates a unique tag because of dynamic SESSION_ID and MSISDN values in the URL.

---

## 🛠️ **SOLUTION 1: Update K6 Script (Recommended)**

Add this configuration to your K6 script to group similar requests:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// Add this configuration to group requests
export const options = {
  // ... your existing options ...
  
  // Configure URL grouping to avoid tag explosion
  discardResponseBodies: false,
  
  // Group requests by endpoint, not full URL
  tags: {
    // Use static tags instead of dynamic ones
    endpoint: 'MenuManagement/RequestReceiver',
    service: 'ussd_gateway',
    test_type: 'load_test'
  }
};

// Update your makeUSSDRequest function
function makeUSSDRequest(sessionId, phoneNumber, input, newRequest) {
  const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`;
  
  const params = {
    LOGIN: CONFIG.LOGIN,
    PASSWORD: CONFIG.PASSWORD,
    SESSION_ID: sessionId,
    MSISDN: phoneNumber,
    NewRequest: newRequest,
    INPUT: input
  };
  
  // Use name parameter to group requests by step type instead of full URL
  const requestOptions = {
    tags: {
      name: `ussd_request_step_${input || 'start'}`, // Group by input type
      step_type: input === CONFIG.DIAL_CODE ? 'dial' : 'input',
      // Don't include session_id or msisdn in tags
    }
  };
  
  const response = http.get(url, { params }, requestOptions);
  
  return { response };
}
```

---

## 🛠️ **SOLUTION 2: Increase InfluxDB Limits**

If you want to keep detailed tracking, increase InfluxDB limits:

### **A. Edit InfluxDB Configuration:**
```bash
# Edit InfluxDB config
sudo nano /etc/influxdb/influxdb.conf

# Add/modify in [data] section:
[data]
  max-series-per-database = 10000000
  max-values-per-tag = 1000000

# Restart InfluxDB
sudo systemctl restart influxdb
```

### **B. Or Set Environment Variables:**
```bash
# Set before running InfluxDB
export INFLUXDB_DATA_MAX_VALUES_PER_TAG=1000000
export INFLUXDB_DATA_MAX_SERIES_PER_DATABASE=10000000

sudo systemctl restart influxdb
```

---

## 🛠️ **SOLUTION 3: Use Alternative K6 Output**

### **A. Use JSON Output + Import Later:**
```bash
# Run K6 with JSON output instead
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js

# Then import to InfluxDB with processing
```

### **B. Use InfluxDB v2 Output:**
```bash
# Use InfluxDB v2 format (better handling)
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## 🎯 **QUICK FIX (Recommended):**

### **Option A: Use JSON Output for Now**
```bash
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/results-$(date +%Y%m%d_%H%M%S).json \
  --summary-export=/loadtest/summary-$(date +%Y%m%d_%H%M%S).json \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

### **Option B: Increase InfluxDB Limit Quickly**
```bash
# Quick increase of InfluxDB limits
echo '[data]
max-values-per-tag = 1000000
max-series-per-database = 10000000' | sudo tee -a /etc/influxdb/influxdb.conf

sudo systemctl restart influxdb

# Then run your original command
sudo docker run --network host -i --rm -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  /loadtest/ussd-load-test-1756881987993_m.js
```

---

## 📊 **WHY THIS HAPPENS:**

1. **Your K6 script** generates unique URLs like:
   ```
   http://10.22.21.207:9402/MenuManagement/RequestReceiver?SESSION_ID=9965888505&MSISDN=7774076861&INPUT=123
   http://10.22.21.207:9402/MenuManagement/RequestReceiver?SESSION_ID=9965888506&MSISDN=7774076862&INPUT=123
   ```

2. **InfluxDB stores** each unique URL as a separate tag value

3. **With 50 users** over 8 minutes, you generate 100,000+ unique combinations

4. **InfluxDB default limit** is 100,000 tag values per measurement

---

## ✅ **RECOMMENDED ACTION:**

**Use Option B (increase InfluxDB limits) for immediate fix:**

```bash
echo '[data]
max-values-per-tag = 1000000' | sudo tee -a /etc/influxdb/influxdb.conf

sudo systemctl restart influxdb
```

**Then re-run your K6 command and it should work!** 🚀

The error will disappear and your metrics will flow to Grafana properly.
