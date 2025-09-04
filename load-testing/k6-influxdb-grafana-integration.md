# 🚀 K6 → InfluxDB → Grafana Integration Setup

## 📊 COMPLETE INTEGRATION: K6 Load Testing with Real-time InfluxDB Storage & Grafana Visualization

### 🎯 **WHAT YOU'LL GET:**
```
K6 Tests → InfluxDB → Grafana Dashboard → Real-time Insights
```

---

## 🗄️ **STEP 1: InfluxDB Setup**

### **Create InfluxDB Database for K6:**
```bash
# Connect to InfluxDB
influx

# Create database for K6 metrics
CREATE DATABASE k6

# Create retention policy (optional - keeps data for 30 days)
CREATE RETENTION POLICY "k6_retention" ON "k6" DURATION 30d REPLICATION 1 DEFAULT

# Verify database created
SHOW DATABASES

# Exit InfluxDB CLI
exit
```

### **InfluxDB Connection Details:**
```
Database: k6
Host: localhost (or your InfluxDB host)
Port: 8086
Protocol: HTTP
```

---

## 📊 **STEP 2: Grafana InfluxDB Data Source Setup**

### **Add InfluxDB Data Source in Grafana:**

1. **Open Grafana** (usually http://localhost:3000)
2. **Go to**: Configuration → Data Sources
3. **Click**: "Add data source"
4. **Select**: "InfluxDB"
5. **Configure**:
   ```
   Name: K6-InfluxDB
   URL: http://localhost:8086
   Database: k6
   User: (your InfluxDB user)
   Password: (your InfluxDB password)
   ```
6. **Click**: "Save & Test"

---

## 🚀 **STEP 3: Enhanced K6 Command with InfluxDB Output**

### **Your K6 Command Should Be:**
```bash
# Basic K6 with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 your-test-script.js

# Enhanced K6 with multiple outputs
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --out json=results.json \
  --summary-export=summary.json \
  your-test-script.js

# With Docker (if using K6 in Docker)
docker run --rm -i grafana/k6:latest run \
  --out influxdb=http://host.docker.internal:8086/k6 \
  - < your-test-script.js

# With custom InfluxDB tags (for better filtering)
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  --tag environment=staging \
  --tag version=v1.0 \
  your-test-script.js
```

### **InfluxDB Output Format Details:**
```
Format: --out influxdb=http://[host]:[port]/[database]
Protocol: HTTP (default) or HTTPS
Authentication: Basic auth supported
Tags: Automatic + custom tags for filtering
```

---

## 📈 **STEP 4: K6 + InfluxDB Metrics Schema**

### **Automatic Metrics Stored in InfluxDB:**

#### **🔥 Core Performance Metrics:**
```sql
-- HTTP request duration
SELECT * FROM http_req_duration WHERE time > now() - 1h

-- HTTP request rate
SELECT * FROM http_reqs WHERE time > now() - 1h

-- Error rate
SELECT * FROM http_req_failed WHERE time > now() - 1h

-- Virtual users
SELECT * FROM vus WHERE time > now() - 1h

-- Iterations
SELECT * FROM iterations WHERE time > now() - 1h
```

#### **🎯 Your Custom Metrics (from your K6 script):**
```sql
-- Session duration
SELECT * FROM session_duration WHERE time > now() - 1h

-- Flow completion rate
SELECT * FROM flow_completion WHERE time > now() - 1h

-- Step failures
SELECT * FROM step_failures WHERE time > now() - 1h

-- Business metrics
SELECT * FROM successful_transactions WHERE time > now() - 1h
SELECT * FROM failed_transactions WHERE time > now() - 1h
SELECT * FROM user_abandonment WHERE time > now() - 1h
```

#### **🏷️ Automatic Tags for Filtering:**
```sql
-- Filter by test run
SELECT * FROM http_req_duration WHERE testid = 'ussd_test_20250903_143022'

-- Filter by environment
SELECT * FROM flow_completion WHERE environment = 'staging'

-- Filter by scenario
SELECT * FROM session_duration WHERE scenario = 'Flow_START_1_Path_1'

-- Filter by step type
SELECT * FROM step_failures WHERE step_type = 'INPUT'
```

---

## 🎨 **STEP 5: Import Grafana K6 Dashboard**

### **Method 1: Import Official K6 Dashboard**
```
1. Go to Grafana → Dashboards → Import
2. Enter Dashboard ID: 2587 (Official K6 Load Testing Results)
3. Select your "K6-InfluxDB" data source
4. Click Import
```

### **Method 2: Import Enhanced K6 Dashboard**
```
1. Go to Grafana → Dashboards → Import  
2. Enter Dashboard ID: 10553 (K6 Load Testing Results with InfluxDB)
3. Select your "K6-InfluxDB" data source
4. Click Import
```

### **Method 3: Custom Dashboard for Your USSD Metrics**
```json
{
  "dashboard": {
    "title": "USSD Load Testing - Custom Metrics",
    "panels": [
      {
        "title": "Flow Completion Rate",
        "type": "stat",
        "targets": [
          {
            "query": "SELECT mean(\"value\") FROM \"flow_completion\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
          }
        ]
      },
      {
        "title": "Session Duration Trend",
        "type": "graph",
        "targets": [
          {
            "query": "SELECT mean(\"value\") FROM \"session_duration\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
          }
        ]
      },
      {
        "title": "Step Failures by Type",
        "type": "table",
        "targets": [
          {
            "query": "SELECT last(\"value\") FROM \"step_failures\" WHERE $timeFilter GROUP BY \"step_type\""
          }
        ]
      }
    ]
  }
}
```

---

## ⚡ **STEP 6: Real-time Monitoring Commands**

### **Start K6 Test with Real-time Monitoring:**
```bash
# Terminal 1: Start K6 test with InfluxDB output
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_realtime_$(date +%Y%m%d_%H%M%S) \
  --tag environment=production \
  ussd-load-test.js

# Terminal 2: Monitor InfluxDB data in real-time
influx -database k6 -execute "SELECT COUNT(*) FROM http_reqs WHERE time > now() - 1m"

# Terminal 3: Monitor Grafana dashboard
# Open: http://localhost:3000/d/YOUR_DASHBOARD_ID
```

### **Real-time Data Verification:**
```bash
# Check if data is flowing to InfluxDB
curl -G 'http://localhost:8086/query' \
  --data-urlencode "db=k6" \
  --data-urlencode "q=SELECT COUNT(*) FROM http_reqs WHERE time > now() - 5m"

# Check latest metrics
curl -G 'http://localhost:8086/query' \
  --data-urlencode "db=k6" \
  --data-urlencode "q=SELECT * FROM flow_completion ORDER BY time DESC LIMIT 10"
```

---

## 🛠️ **STEP 7: Enhanced K6 Script Configuration**

### **Update Your Generated K6 Script:**

Add this to your K6 script options:
```javascript
export const options = {
  // ... your existing options ...
  
  // Enhanced InfluxDB configuration
  ext: {
    influxdb: {
      // Push all metrics to InfluxDB
      pushMetrics: true,
      
      // Custom tags for better filtering
      tags: {
        testType: 'ussd_load_test',
        environment: 'staging',
        version: __ENV.TEST_VERSION || 'v1.0',
        testRun: __ENV.TEST_RUN_ID || new Date().toISOString().slice(0,19).replace(/[:-]/g, '')
      }
    }
  },
  
  // Additional thresholds for InfluxDB alerts
  thresholds: {
    // ... your existing thresholds ...
    
    // Real-time monitoring thresholds
    'flow_completion': ['rate>0.95'],
    'session_duration': ['p(95)<10000'],
    'step_failures': ['rate<0.02'],
    'successful_transactions': ['rate>0.98']
  }
};
```

---

## 📊 **STEP 8: Complete Workflow**

### **🚀 Your Complete Testing Workflow:**

```bash
# 1. Prepare InfluxDB
influx -execute "DROP DATABASE k6; CREATE DATABASE k6"

# 2. Generate your K6 script using the React app
# (Your K6TestGenerator.jsx will create the script)

# 3. Run K6 with InfluxDB output
k6 run \
  --out influxdb=http://localhost:8086/k6 \
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \
  --tag environment=staging \
  generated-ussd-test.js

# 4. Monitor in Grafana
echo "View dashboard: http://localhost:3000"

# 5. Verify data in InfluxDB
influx -database k6 -execute "SELECT COUNT(*) FROM http_reqs"
```

### **📈 What You'll See in Grafana:**
```
✅ Real-time HTTP request rates
✅ Response time percentiles (P50, P95, P99)
✅ Error rates and success rates  
✅ Virtual user counts over time
✅ Your custom flow completion rates
✅ Session duration trends
✅ Step failure analysis
✅ Business transaction metrics
✅ User abandonment tracking
```

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues & Solutions:**

#### **❌ InfluxDB Connection Failed:**
```bash
# Check InfluxDB is running
curl http://localhost:8086/ping

# Check database exists
influx -execute "SHOW DATABASES"

# Test connection
k6 run --out influxdb=http://localhost:8086/k6 --duration 10s --vus 1 -e 'export default function(){}' 
```

#### **❌ No Data in Grafana:**
```bash
# Verify data in InfluxDB
influx -database k6 -execute "SHOW MEASUREMENTS"
influx -database k6 -execute "SELECT COUNT(*) FROM http_reqs"

# Check Grafana data source
curl -X POST http://admin:admin@localhost:3000/api/datasources/proxy/1/query \
  -H "Content-Type: application/json" \
  -d '{"q": "SHOW MEASUREMENTS", "db": "k6"}'
```

#### **❌ Docker K6 Can't Reach InfluxDB:**
```bash
# Use host.docker.internal for InfluxDB connection
docker run --rm -i grafana/k6:latest run \
  --out influxdb=http://host.docker.internal:8086/k6 \
  - < your-script.js

# Or use network mode
docker run --rm -i --network host grafana/k6:latest run \
  --out influxdb=http://localhost:8086/k6 \
  - < your-script.js
```

---

## 🎯 **NEXT STEPS**

1. **Set up InfluxDB database** (Step 1)
2. **Configure Grafana data source** (Step 2)
3. **Update your K6 command** with `--out influxdb=http://localhost:8086/k6`
4. **Import K6 dashboard** in Grafana (Dashboard ID: 2587)
5. **Run your test** and watch real-time metrics!

### **Your K6 Command Will Be:**
```bash
k6 run --out influxdb=http://localhost:8086/k6 your-generated-script.js
```

**Ready to see your USSD load test metrics in real-time Grafana dashboards!** 📊🚀
