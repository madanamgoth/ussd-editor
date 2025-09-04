# Enhanced K6 Monitoring Setup for USSD Load Testing

## 🚀 Enhanced Docker Command

Replace your current command with this enhanced version:

```bash
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  -e K6_INFLUXDB_ORGANIZATION=k6 \
  -e K6_INFLUXDB_BUCKET=k6 \
  -e K6_INFLUXDB_TOKEN=your-influxdb-token \
  grafana/k6 run \
  --out influxdb=http://127.0.0.1:8086/k6 \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  --tag version=v2.0 \
  --summary-trend-stats="min,avg,med,max,p(90),p(95),p(99)" \
  --summary-time-unit=ms \
  /loadtest/ussd-load-test-enhanced.js
```

## 📊 Enhanced Grafana Dashboard Queries

### 1. Virtual Users Over Time
```sql
SELECT mean("value") 
FROM "vus" 
WHERE $timeFilter 
GROUP BY time($__interval) fill(null)
```

### 2. Request Rate (TPS)
```sql
SELECT derivative(mean("count"), 1s) 
FROM "http_reqs" 
WHERE $timeFilter 
GROUP BY time($__interval) fill(null)
```

### 3. Response Time Percentiles
```sql
SELECT 
  percentile("value", 50) AS "p50",
  percentile("value", 90) AS "p90", 
  percentile("value", 95) AS "p95",
  percentile("value", 99) AS "p99"
FROM "http_req_duration" 
WHERE $timeFilter 
GROUP BY time($__interval) fill(null)
```

### 4. Error Rate by Step Type
```sql
SELECT mean("value")*100 
FROM "step_error_rate" 
WHERE $timeFilter 
GROUP BY "step_type", time($__interval) fill(null)
```

### 5. Flow Completion Rate by Scenario
```sql
SELECT mean("value")*100 
FROM "flow_completion" 
WHERE $timeFilter 
GROUP BY "scenario_name", time($__interval) fill(null)
```

### 6. Business Metrics - Transaction Value
```sql
SELECT mean("value") 
FROM "average_session_value" 
WHERE $timeFilter 
GROUP BY time($__interval) fill(null)
```

### 7. Step Performance Heatmap
```sql
SELECT 
  $__timeGroup(time, $__interval),
  "step" as metric,
  percentile("value", 95) as value
FROM "step_response_time"
WHERE $timeFilter
GROUP BY time($__interval), "step"
ORDER BY time
```

## 🔧 InfluxDB Setup Commands

### Create Database and Retention Policy
```bash
# Connect to InfluxDB
influx

# Create database
CREATE DATABASE k6

# Create retention policies
CREATE RETENTION POLICY "one_day" ON "k6" DURATION 1d REPLICATION 1 DEFAULT
CREATE RETENTION POLICY "one_week" ON "k6" DURATION 7d REPLICATION 1  
CREATE RETENTION POLICY "one_month" ON "k6" DURATION 30d REPLICATION 1

# Create continuous queries for downsampling
CREATE CONTINUOUS QUERY "cq_http_req_duration_1h" ON "k6"
BEGIN
  SELECT mean("value") AS "mean_value"
  INTO "one_week"."http_req_duration_1h"
  FROM "http_req_duration"
  GROUP BY time(1h), *
END
```

## 📈 Key Metrics to Monitor

### Performance Metrics
- **TPS (Transactions Per Second)**: `derivative(http_reqs.count)`
- **Response Time**: `http_req_duration` (p50, p95, p99)
- **Virtual Users**: `vus` and `vus_max`
- **Iteration Duration**: `iteration_duration`

### Error Metrics
- **HTTP Error Rate**: `http_req_failed`
- **Step Error Rate**: `step_error_rate` (custom metric)
- **Flow Completion**: `flow_completion` (custom metric)
- **Content Validation**: `response_content_match` (custom metric)

### Business Metrics
- **Successful Transactions**: `successful_transactions`
- **Failed Transactions**: `failed_transactions`
- **User Abandonment**: `user_abandonment`
- **Average Session Value**: `average_session_value`

### Step-Level Analysis
- **Step Response Time**: `step_response_time`
- **Step Success Rate**: `step_success_rate`
- **Action Node Duration**: `action_node_duration`
- **Input Validation Success**: `input_validation_success`

## 🎯 Advanced Analysis Queries

### Find Slowest Steps
```sql
SELECT 
  "step_type",
  "store_attribute", 
  percentile("value", 95) as p95_response_time
FROM "step_response_time" 
WHERE time >= now() - 1h
GROUP BY "step_type", "store_attribute"
ORDER BY p95_response_time DESC
LIMIT 10
```

### Error Analysis by Scenario
```sql
SELECT 
  "scenario_name",
  "step_type",
  sum("value") as total_errors
FROM "step_error_rate" 
WHERE time >= now() - 1h
GROUP BY "scenario_name", "step_type"
ORDER BY total_errors DESC
```

### Flow Type Performance Comparison
```sql
SELECT 
  "session_type",
  mean("value") as avg_completion_rate
FROM "flow_completion" 
WHERE time >= now() - 1h
GROUP BY "session_type"
```

## 🔍 Troubleshooting Failed Test Cases

### 1. Check Specific Error Patterns
Look for these custom metrics in Grafana:
- `step_error_rate` grouped by `step_type`
- `response_content_match` to see validation failures
- `input_validation_success` for dynamic input issues

### 2. Correlate with System Metrics
Add these panels to your dashboard:
- CPU usage on USSD server
- Memory utilization
- Database connection pool
- Network latency

### 3. Business Impact Analysis
Track:
- Transaction success rate by amount ranges
- PIN validation failure patterns
- Phone number format issues

## 🛠️ Alternative Tools for Deep Analysis

### 1. Elasticsearch + Kibana
```bash
# Send K6 results to Elasticsearch
k6 run --out json=results.json script.js
# Import to Elasticsearch for advanced analysis
```

### 2. Prometheus + Grafana
```bash
# Use K6 Prometheus remote write
k6 run --out experimental-prometheus-rw script.js
```

### 3. DataDog Integration
```bash
# Send metrics to DataDog
k6 run --out datadog script.js
```

## 🎛️ Real-time Monitoring Dashboard

Create these panels in Grafana:

1. **Traffic Light Panel**: Overall health (green/yellow/red)
2. **TPS Gauge**: Current transactions per second
3. **Response Time Graph**: Real-time latency trends
4. **Error Rate Alert**: Threshold-based alerts
5. **Flow Success Heatmap**: Visual flow performance
6. **Business Metrics Table**: Transaction values and counts

## 📱 Mobile Dashboard Access

Set up Grafana mobile app for real-time monitoring during load tests.

## 🚨 Alerting Setup

Configure alerts for:
- Error rate > 5%
- Response time p95 > 3 seconds
- Flow completion rate < 90%
- TPS drops below expected threshold
