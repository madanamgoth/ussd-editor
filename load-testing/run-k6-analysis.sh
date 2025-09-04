#!/bin/bash

# K6 JSON Analysis and Import Script
# Usage: ./run-k6-analysis.sh [test-name]

set -e

# Configuration
LOADTEST_DIR="/home/mobiquity/loadtest"
INFLUXDB_URL="http://127.0.0.1:8086"
DATABASE="k6"
TEST_NAME=${1:-"ussd-load-test"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🚀 K6 Load Test with JSON Analysis"
echo "=================================="
echo "Test Name: $TEST_NAME"
echo "Timestamp: $TIMESTAMP"
echo "Output Dir: $LOADTEST_DIR"
echo ""

# Step 1: Run K6 Test with JSON Output
echo "📊 Step 1: Running K6 Load Test..."
sudo docker run -i --rm \
  --network host \
  -v $LOADTEST_DIR:/loadtest \
  grafana/k6 run \
  --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
  --tag testid=${TEST_NAME}-${TIMESTAMP} \
  --tag environment=staging \
  --tag version=v2.0 \
  --tag hostname=$(hostname) \
  --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
  --summary-trend-stats="min,avg,med,max,p(90),p(95),p(99)" \
  --summary-time-unit=ms \
  --verbose \
  /loadtest/ussd-load-test-enhanced.js 2>&1 | tee $LOADTEST_DIR/${TEST_NAME}-console-${TIMESTAMP}.log

echo ""
echo "✅ K6 Test Completed!"
echo "📁 Files generated:"
echo "   JSON Results: ${TEST_NAME}-${TIMESTAMP}.json"
echo "   Summary: ${TEST_NAME}-summary-${TIMESTAMP}.json"
echo "   Console Log: ${TEST_NAME}-console-${TIMESTAMP}.log"
echo ""

# Step 2: Analyze JSON Results
echo "🔍 Step 2: Analyzing Results..."
python3 k6-json-importer.py $LOADTEST_DIR/${TEST_NAME}-${TIMESTAMP}.json --analyze-only

echo ""

# Step 3: Ask user if they want to import to InfluxDB
read -p "📥 Do you want to import results to InfluxDB for Grafana? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Step 3: Importing to InfluxDB..."
    
    # Check if InfluxDB is running
    if curl -s $INFLUXDB_URL/ping > /dev/null; then
        echo "✅ InfluxDB is accessible"
        
        # Create database if it doesn't exist
        echo "🗄️  Creating database '$DATABASE'..."
        curl -s -XPOST "$INFLUXDB_URL/query" --data-urlencode "q=CREATE DATABASE $DATABASE" > /dev/null
        
        # Import data
        python3 k6-json-importer.py $LOADTEST_DIR/${TEST_NAME}-${TIMESTAMP}.json \
            --influxdb-url $INFLUXDB_URL \
            --database $DATABASE \
            --batch-size 1000
        
        echo ""
        echo "🎯 Import completed! Access your data in Grafana:"
        echo "   Grafana URL: http://10.22.21.189:3000"
        echo "   Database: $DATABASE"
        echo "   Test ID: ${TEST_NAME}-${TIMESTAMP}"
        
    else
        echo "❌ InfluxDB is not accessible at $INFLUXDB_URL"
        echo "   Please start InfluxDB and try again"
    fi
else
    echo "⏭️  Skipping InfluxDB import"
fi

# Step 4: Generate Quick HTML Report
echo ""
echo "📄 Step 4: Generating Quick Report..."

# Create a simple HTML report
cat > $LOADTEST_DIR/${TEST_NAME}-report-${TIMESTAMP}.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Report - ${TEST_NAME}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007acc; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 K6 Load Test Report</h1>
        <p><strong>Test:</strong> ${TEST_NAME}</p>
        <p><strong>Timestamp:</strong> ${TIMESTAMP}</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>
    
    <h2>📊 Test Files</h2>
    <ul>
        <li><strong>JSON Results:</strong> ${TEST_NAME}-${TIMESTAMP}.json</li>
        <li><strong>Summary:</strong> ${TEST_NAME}-summary-${TIMESTAMP}.json</li>
        <li><strong>Console Log:</strong> ${TEST_NAME}-console-${TIMESTAMP}.log</li>
    </ul>
    
    <h2>🎯 Quick Analysis</h2>
    <p>Run the following commands for detailed analysis:</p>
    <pre>
# Analyze JSON results
python3 k6-json-importer.py ${TEST_NAME}-${TIMESTAMP}.json --analyze-only

# Import to InfluxDB
python3 k6-json-importer.py ${TEST_NAME}-${TIMESTAMP}.json

# View summary
cat ${TEST_NAME}-summary-${TIMESTAMP}.json | jq .
    </pre>
    
    <h2>📈 Grafana Dashboard</h2>
    <p>If you imported to InfluxDB, view results in Grafana:</p>
    <ul>
        <li><strong>URL:</strong> http://10.22.21.189:3000</li>
        <li><strong>Database:</strong> $DATABASE</li>
        <li><strong>Test ID:</strong> ${TEST_NAME}-${TIMESTAMP}</li>
    </ul>
    
    <h2>🔍 Console Output Preview</h2>
    <pre>$(tail -50 $LOADTEST_DIR/${TEST_NAME}-console-${TIMESTAMP}.log)</pre>
</body>
</html>
EOF

echo "✅ Report generated: ${TEST_NAME}-report-${TIMESTAMP}.html"
echo ""

# Summary
echo "🎉 Test Analysis Complete!"
echo "=========================="
echo "📁 All files are in: $LOADTEST_DIR"
echo "📊 View HTML report: ${TEST_NAME}-report-${TIMESTAMP}.html"
echo "🔍 Raw data: ${TEST_NAME}-${TIMESTAMP}.json"
echo ""
echo "🚀 Next Steps:"
echo "1. Open the HTML report for quick overview"
echo "2. Use Grafana for detailed analysis (if imported)"
echo "3. Analyze JSON with custom scripts if needed"
echo ""
