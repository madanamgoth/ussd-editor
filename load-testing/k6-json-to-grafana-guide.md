# K6 JSON Output to Grafana Analysis Guide

## 🎯 **Method 1: Direct JSON Output**

### **1. Run K6 with JSON Output**
```bash
# Generate JSON log file
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-results-$(date +%Y%m%d-%H%M%S).json \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  --tag version=v2.0 \
  --summary-trend-stats="min,avg,med,max,p(90),p(95),p(99)" \
  --summary-time-unit=ms \
  /loadtest/ussd-load-test-enhanced.js

# This creates a detailed JSON file with all metrics
```

### **2. JSON Output Format**
The JSON file will contain entries like:
```json
{"type":"Metric","data":{"name":"http_req_duration","type":"trend","contains":"time","tainted":null,"thresholds":[],"submetrics":null},"metric":"http_req_duration"}
{"type":"Point","data":{"time":"2025-09-03T10:30:15.123Z","value":124.5,"tags":{"scenario":"Flow_StartNode_Path_1","step":"2","step_type":"INPUT"}},"metric":"http_req_duration"}
```

## 🔧 **Method 2: Convert JSON to InfluxDB Line Protocol**

### **Create Converter Script**
```python
#!/usr/bin/env python3
import json
import sys
from datetime import datetime

def json_to_influx(json_file, output_file):
    with open(json_file, 'r') as f, open(output_file, 'w') as out:
        for line in f:
            try:
                data = json.loads(line.strip())
                if data.get('type') == 'Point':
                    metric_name = data['metric']
                    timestamp = data['data']['time']
                    value = data['data']['value']
                    tags = data['data'].get('tags', {})
                    
                    # Convert to InfluxDB line protocol
                    tag_str = ','.join([f"{k}={v}" for k, v in tags.items()])
                    if tag_str:
                        line_protocol = f"{metric_name},{tag_str} value={value} {timestamp}"
                    else:
                        line_protocol = f"{metric_name} value={value} {timestamp}"
                    
                    out.write(line_protocol + '\n')
            except:
                continue

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 json_to_influx.py input.json output.txt")
        sys.exit(1)
    
    json_to_influx(sys.argv[1], sys.argv[2])
    print(f"Converted {sys.argv[1]} to {sys.argv[2]}")
```

### **Usage:**
```bash
# Convert JSON to InfluxDB format
python3 json_to_influx.py k6-results-20250903-103015.json influx-data.txt

# Import to InfluxDB
influx -import -path=influx-data.txt -precision=ns -database=k6
```

## 🎯 **Method 3: Elasticsearch + Kibana (Alternative)**

### **1. Run K6 with JSON Output**
```bash
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-results.json \
  /loadtest/ussd-load-test-enhanced.js
```

### **2. Import to Elasticsearch**
```bash
# Using Logstash or Filebeat to import JSON
# Or direct import with curl
cat k6-results.json | while read line; do
  curl -X POST "localhost:9200/k6-results/_doc" \
    -H "Content-Type: application/json" \
    -d "$line"
done
```

## 📊 **Method 4: Direct Grafana JSON Datasource**

### **1. Create Summary JSON from K6 Output**
```python
#!/usr/bin/env python3
import json
import pandas as pd
from datetime import datetime

def process_k6_json(json_file):
    metrics = {}
    
    with open(json_file, 'r') as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                if data.get('type') == 'Point':
                    metric_name = data['metric']
                    point_data = data['data']
                    
                    if metric_name not in metrics:
                        metrics[metric_name] = []
                    
                    metrics[metric_name].append({
                        'timestamp': point_data['time'],
                        'value': point_data['value'],
                        'tags': point_data.get('tags', {})
                    })
            except:
                continue
    
    # Convert to time series format for Grafana
    for metric, points in metrics.items():
        df = pd.DataFrame(points)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.to_csv(f"grafana_{metric}.csv", index=False)
        print(f"Created grafana_{metric}.csv with {len(points)} data points")

if __name__ == "__main__":
    process_k6_json("k6-results.json")
```

## 🔍 **Method 5: K6 HTML Report + Analysis**

### **1. Generate HTML Report**
```bash
# Run K6 with both JSON and summary output
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/results.json \
  --summary-export=/loadtest/summary.json \
  /loadtest/ussd-load-test-enhanced.js > /loadtest/console.log 2>&1

# Generate HTML report (if you have k6-reporter)
npm install -g k6-html-reporter
k6-html-reporter --json-file=results.json --output=report.html
```

## 🎯 **Recommended Approach for Your Use Case**

### **Best Option: JSON → InfluxDB → Grafana**

**Step 1: Run K6 with JSON Output**
```bash
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/k6-detailed-$(date +%Y%m%d-%H%M%S).json \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  --summary-export=/loadtest/summary-$(date +%Y%m%d-%H%M%S).json \
  /loadtest/ussd-load-test-enhanced.js | tee /loadtest/console-$(date +%Y%m%d-%H%M%S).log
```

**Step 2: Import JSON to InfluxDB**
```python
# Enhanced import script
import json
import requests
from datetime import datetime
import time

def import_k6_json_to_influxdb(json_file, influxdb_url="http://127.0.0.1:8086", database="k6"):
    url = f"{influxdb_url}/write?db={database}&precision=ns"
    
    batch_size = 1000
    batch = []
    
    with open(json_file, 'r') as f:
        for line_num, line in enumerate(f):
            try:
                data = json.loads(line.strip())
                if data.get('type') == 'Point':
                    metric_name = data['metric']
                    point_data = data['data']
                    
                    # Convert timestamp to nanoseconds
                    timestamp = datetime.fromisoformat(point_data['time'].replace('Z', '+00:00'))
                    timestamp_ns = int(timestamp.timestamp() * 1e9)
                    
                    # Build tags
                    tags = point_data.get('tags', {})
                    tag_str = ','.join([f"{k}={v}" for k, v in tags.items() if v])
                    
                    # Build line protocol
                    if tag_str:
                        line_protocol = f"{metric_name},{tag_str} value={point_data['value']} {timestamp_ns}"
                    else:
                        line_protocol = f"{metric_name} value={point_data['value']} {timestamp_ns}"
                    
                    batch.append(line_protocol)
                    
                    # Send batch when full
                    if len(batch) >= batch_size:
                        payload = '\n'.join(batch)
                        response = requests.post(url, data=payload)
                        if response.status_code != 204:
                            print(f"Error: {response.status_code} - {response.text}")
                        else:
                            print(f"Imported batch ending at line {line_num}")
                        batch = []
                        
            except Exception as e:
                print(f"Error processing line {line_num}: {e}")
                continue
    
    # Send remaining batch
    if batch:
        payload = '\n'.join(batch)
        response = requests.post(url, data=payload)
        if response.status_code == 204:
            print(f"Final batch imported successfully")
        else:
            print(f"Error in final batch: {response.status_code}")

# Usage
import_k6_json_to_influxdb("k6-detailed-20250903-103015.json")
```

**Step 3: Use Grafana Dashboard**
Now you can use the same Grafana dashboard to analyze your imported data!

## 🎯 **Quick Analysis Commands**

### **Analyze JSON Directly**
```bash
# Count total requests
cat k6-results.json | grep '"metric":"http_reqs"' | wc -l

# Get error summary
cat k6-results.json | grep '"metric":"errors"' | jq '.data.value' | awk '{sum+=$1} END {print sum}'

# Extract response times
cat k6-results.json | grep '"metric":"http_req_duration"' | jq '.data.value' > response_times.txt
```

### **Generate Quick Report**
```python
# Quick analysis script
import json
import statistics

def quick_analysis(json_file):
    response_times = []
    errors = 0
    total_requests = 0
    
    with open(json_file, 'r') as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                if data.get('type') == 'Point':
                    if data['metric'] == 'http_req_duration':
                        response_times.append(data['data']['value'])
                    elif data['metric'] == 'errors':
                        errors += data['data']['value']
                    elif data['metric'] == 'http_reqs':
                        total_requests += data['data']['value']
            except:
                continue
    
    if response_times:
        print(f"Response Time Analysis:")
        print(f"  Average: {statistics.mean(response_times):.2f}ms")
        print(f"  Median: {statistics.median(response_times):.2f}ms")
        print(f"  P95: {sorted(response_times)[int(len(response_times)*0.95)]:.2f}ms")
        print(f"  P99: {sorted(response_times)[int(len(response_times)*0.99)]:.2f}ms")
    
    print(f"Total Requests: {total_requests}")
    print(f"Total Errors: {errors}")
    print(f"Error Rate: {(errors/total_requests)*100:.2f}%" if total_requests > 0 else "N/A")

quick_analysis("k6-results.json")
```

This approach gives you **complete control** over your data and allows for **detailed post-test analysis** without needing real-time InfluxDB setup! 🚀
