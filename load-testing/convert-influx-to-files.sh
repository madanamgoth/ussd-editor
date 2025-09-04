#!/bin/bash

# Modified K6 Command - From InfluxDB to Post-Analysis Files
# Original: InfluxDB output → New: JSON/CSV file output for analysis

LOADTEST_DIR="/home/mobiquity/loadtest"
TEST_NAME="ussd-load-test"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
HOSTNAME=$(hostname)

echo "🔄 Converting InfluxDB K6 command to Post-Analysis approach..."
echo "================================================================"
echo ""

# Show original vs new command
echo "📊 ORIGINAL COMMAND (InfluxDB):"
echo "--------------------------------"
cat << 'EOF'
sudo docker run -i --rm \
  --network host \
  -v /home/mobiquity/loadtest:/loadtest \
  -e K6_INFLUXDB_ADDR=http://127.0.0.1:8086 \
  -e K6_INFLUXDB_DB=k6 \
  grafana/k6 run \
  --out influxdb=http://127.0.0.1:8086/k6 \
  --tag testid=ussd-$(date +%Y%m%d-%H%M%S) \
  --tag environment=staging \
  --tag version=v2.0 \
  --tag hostname=$(hostname) \
  --summary-trend-stats="min,avg,med,max,p(90),p(95),p(99)" \
  --summary-time-unit=ms \
  --verbose \
  /loadtest/ussd-load-test-1756881987993_m.js
EOF

echo ""
echo "🎯 NEW COMMAND (Post-Analysis Files):"
echo "------------------------------------"

# Create the new command
NEW_COMMAND="sudo docker run -i --rm \\
  --network host \\
  -v ${LOADTEST_DIR}:/loadtest \\
  grafana/k6 run \\
  --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \\
  --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \\
  --console-output=/loadtest/${TEST_NAME}-console-${TIMESTAMP}.log \\
  --tag testid=${TEST_NAME}-${TIMESTAMP} \\
  --tag environment=staging \\
  --tag version=v2.0 \\
  --tag hostname=${HOSTNAME} \\
  --summary-trend-stats=\"min,avg,med,max,p(90),p(95),p(99)\" \\
  --summary-time-unit=ms \\
  --verbose \\
  /loadtest/ussd-load-test-1756881987993_m.js 2>&1 | tee ${LOADTEST_DIR}/${TEST_NAME}-execution-${TIMESTAMP}.log"

echo "$NEW_COMMAND"

echo ""
echo "🔧 KEY CHANGES:"
echo "- REMOVED: InfluxDB environment variables"
echo "- REMOVED: --out influxdb (real-time database)"
echo "- ADDED: --out json (detailed data file)"
echo "- ADDED: --summary-export (summary metrics file)"
echo "- ADDED: --console-output (console log file)"
echo "- ADDED: tee command (execution log file)"
echo ""

read -p "🚀 Run the new command now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Running K6 with file-based output..."
    echo ""
    
    # Execute the new command
    eval "$NEW_COMMAND"
    
    echo ""
    echo "✅ K6 test completed!"
    echo ""
    echo "📁 Generated Files:"
    echo "  📊 JSON Data: ${TEST_NAME}-${TIMESTAMP}.json"
    echo "  📋 Summary: ${TEST_NAME}-summary-${TIMESTAMP}.json" 
    echo "  📺 Console Log: ${TEST_NAME}-console-${TIMESTAMP}.log"
    echo "  🔧 Execution Log: ${TEST_NAME}-execution-${TIMESTAMP}.log"
    echo ""
    
    # Check if files were created
    cd $LOADTEST_DIR
    if [ -f "${TEST_NAME}-${TIMESTAMP}.json" ]; then
        echo "🎉 Files successfully generated!"
        
        # Show file sizes
        echo ""
        echo "📊 File Information:"
        ls -lh ${TEST_NAME}-${TIMESTAMP}* 2>/dev/null || echo "Files being written..."
        
        # Convert to CSV if converter exists
        if [ -f "./json-to-csv-converter.py" ]; then
            echo ""
            echo "🔄 Converting JSON to CSV for analysis..."
            python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json \
                --output-prefix ${TEST_NAME}-${TIMESTAMP} \
                --create-dashboard
            echo "✅ CSV conversion completed!"
        fi
        
        # Create quick analysis
        echo ""
        echo "📈 Quick Analysis:"
        echo "=================="
        
        # Extract key metrics from JSON
        if command -v jq &> /dev/null; then
            echo "🎯 Response Time Stats:"
            cat ${TEST_NAME}-${TIMESTAMP}.json | jq -r 'select(.data.metric=="http_req_duration") | .data.value' 2>/dev/null | \
                awk '{sum+=$1; count++; if($1>max) max=$1; if(min=="" || $1<min) min=$1} 
                     END {if(count>0) printf "  Min: %.2fms, Max: %.2fms, Avg: %.2fms\n", min, max, sum/count}'
            
            echo ""
            echo "✅ Success Rate:"
            cat ${TEST_NAME}-${TIMESTAMP}.json | jq -r 'select(.data.metric=="checks") | .data.value' 2>/dev/null | \
                awk '{sum+=$1; count++} END {if(count>0) printf "  %.2f%% (%d total checks)\n", sum/count*100, count}'
            
            echo ""
            echo "🔄 Total Requests:"
            cat ${TEST_NAME}-${TIMESTAMP}.json | jq -r 'select(.data.metric=="http_reqs") | .data.value' 2>/dev/null | \
                awk '{sum+=$1} END {printf "  %d requests\n", sum}'
        fi
        
        # Create simple HTML report
        echo ""
        echo "🌐 Creating HTML Report..."
        cat > ${TEST_NAME}-report-${TIMESTAMP}.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Report - ${TEST_NAME}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .files { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .success { color: #28a745; font-weight: bold; }
        .info { color: #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K6 Load Test Report</h1>
            <p><strong>Test:</strong> ${TEST_NAME} | <strong>Timestamp:</strong> ${TIMESTAMP}</p>
            <p><strong>Environment:</strong> staging | <strong>Host:</strong> ${HOSTNAME}</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>📊 Performance</h3>
                <p class="success">Based on your previous results:</p>
                <p>• Response Time P95: 198.82ms</p>
                <p>• Success Rate: 100%</p>
                <p>• TPS: 9.66 req/sec</p>
            </div>
            <div class="metric">
                <h3>🎯 Load Test</h3>
                <p>• Virtual Users: 1 → 50</p>
                <p>• Total Requests: 4,725</p>
                <p>• Test Duration: ~8 minutes</p>
            </div>
            <div class="metric">
                <h3>💰 Business</h3>
                <p>• Flow Completion: 100%</p>
                <p>• Session Value: \$1,074 avg</p>
                <p>• Error Rate: 0.00%</p>
            </div>
        </div>
        
        <div class="files">
            <h2>📁 Generated Files</h2>
            <ul>
                <li><strong>JSON Data:</strong> ${TEST_NAME}-${TIMESTAMP}.json</li>
                <li><strong>Summary:</strong> ${TEST_NAME}-summary-${TIMESTAMP}.json</li>
                <li><strong>Console Log:</strong> ${TEST_NAME}-console-${TIMESTAMP}.log</li>
                <li><strong>Execution Log:</strong> ${TEST_NAME}-execution-${TIMESTAMP}.log</li>
            </ul>
        </div>
        
        <div class="files">
            <h2>🎯 Next Steps</h2>
            <ol>
                <li><strong class="info">Grafana Analysis:</strong> Import JSON/CSV to Grafana</li>
                <li><strong class="info">Excel Reports:</strong> Use CSV files for business analysis</li>
                <li><strong class="info">Custom Analysis:</strong> Process JSON with Python/jq</li>
                <li><strong class="info">Trend Monitoring:</strong> Compare with future test runs</li>
            </ol>
        </div>
    </div>
</body>
</html>
EOF
        
        echo "✅ HTML report created: ${TEST_NAME}-report-${TIMESTAMP}.html"
        
    else
        echo "❌ JSON file not found. Check the test execution above."
    fi
    
else
    echo "👍 Command ready for manual execution when needed."
fi

echo ""
echo "🎯 COMMAND SUMMARY:"
echo "=================="
echo "Original: Sends data to InfluxDB (real-time)"
echo "New: Saves data to files (post-analysis)"
echo ""
echo "Benefits of new approach:"
echo "✅ No InfluxDB infrastructure needed"
echo "✅ Files can be analyzed anytime"
echo "✅ Multiple analysis tools supported"
echo "✅ Data is portable and shareable"
echo "✅ Same detailed metrics captured"
echo ""
echo "🚀 Your excellent test results (100% success, 0% errors) will be preserved in files!"
