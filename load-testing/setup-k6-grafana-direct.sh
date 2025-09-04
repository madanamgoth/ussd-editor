#!/bin/bash

# K6 Direct to Grafana Setup (No InfluxDB Required)
# This script sets up multiple options for K6 → Grafana integration

set -e

LOADTEST_DIR="/home/mobiquity/loadtest"
TEST_NAME=${1:-"ussd-load-test"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🚀 K6 Direct to Grafana Setup"
echo "============================="
echo "Choose your preferred method:"
echo ""
echo "1) Prometheus + Grafana (Local)"
echo "2) Grafana Cloud (Easiest)"  
echo "3) CSV + Grafana CSV Plugin"
echo "4) JSON Analysis Only"
echo ""

read -p "Select option (1-4): " -n 1 -r choice
echo ""

case $choice in
    1)
        echo "🎯 Setting up Prometheus + Grafana..."
        
        # Check if Prometheus is running
        if ! curl -s http://127.0.0.1:9090 > /dev/null; then
            echo "📦 Starting Prometheus..."
            
            # Create Prometheus config
            cat > prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

remote_write:
  - url: http://localhost:9090/api/v1/write
EOF
            
            # Start Prometheus
            docker run -d --name prometheus \
                -p 9090:9090 \
                -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
                prom/prometheus || echo "Prometheus already running"
        fi
        
        # Check if Grafana is running
        if ! curl -s http://127.0.0.1:3000 > /dev/null; then
            echo "📊 Starting Grafana..."
            docker run -d --name grafana \
                -p 3000:3000 \
                -e GF_SECURITY_ADMIN_PASSWORD=admin \
                grafana/grafana || echo "Grafana already running"
        fi
        
        echo "⏳ Waiting for services to start..."
        sleep 10
        
        # Run K6 with Prometheus output
        echo "🔄 Running K6 test with Prometheus output..."
        sudo docker run -i --rm \
            --network host \
            -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out experimental-prometheus-rw=http://127.0.0.1:9090/api/v1/write \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            --tag environment=staging \
            --tag version=v2.0 \
            /loadtest/ussd-load-test-enhanced.js
        
        echo ""
        echo "✅ Test completed!"
        echo "📊 Grafana: http://127.0.0.1:3000 (admin/admin)"
        echo "📈 Prometheus: http://127.0.0.1:9090"
        echo "🎯 Add Prometheus data source: http://127.0.0.1:9090"
        ;;
        
    2)
        echo "☁️  Setting up Grafana Cloud..."
        echo ""
        echo "📋 Please provide your Grafana Cloud details:"
        read -p "Prometheus endpoint URL: " PROMETHEUS_URL
        read -p "Username: " USERNAME
        read -p "API Key: " -s API_KEY
        echo ""
        
        # Run K6 with Grafana Cloud
        echo "🔄 Running K6 test with Grafana Cloud..."
        sudo docker run -i --rm \
            --network host \
            -v $LOADTEST_DIR:/loadtest \
            -e K6_PROMETHEUS_RW_SERVER_URL="$PROMETHEUS_URL" \
            -e K6_PROMETHEUS_RW_USERNAME="$USERNAME" \
            -e K6_PROMETHEUS_RW_PASSWORD="$API_KEY" \
            grafana/k6 run \
            --out experimental-prometheus-rw \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            --tag environment=staging \
            /loadtest/ussd-load-test-enhanced.js
        
        echo ""
        echo "✅ Test completed!"
        echo "☁️  View results in your Grafana Cloud dashboard"
        ;;
        
    3)
        echo "📄 Setting up CSV + Grafana CSV Plugin..."
        
        # Run K6 with JSON output
        echo "🔄 Running K6 test with JSON output..."
        sudo docker run -i --rm \
            --network host \
            -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            --tag environment=staging \
            /loadtest/ussd-load-test-enhanced.js
        
        # Convert JSON to CSV
        echo "📊 Converting JSON to CSV..."
        cd $LOADTEST_DIR
        python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json \
            --output-prefix ${TEST_NAME}-${TIMESTAMP} \
            --create-dashboard
        
        echo ""
        echo "✅ Conversion completed!"
        echo "📁 CSV files created in: $LOADTEST_DIR"
        echo "📊 Dashboard JSON: grafana-csv-dashboard.json"
        echo ""
        echo "🎯 Next steps:"
        echo "1. Install CSV plugin: grafana-cli plugins install marcusolsson-csv-datasource"
        echo "2. Restart Grafana"
        echo "3. Add CSV data sources"
        echo "4. Import dashboard"
        ;;
        
    4)
        echo "📊 JSON Analysis Only..."
        
        # Run K6 with JSON output
        echo "🔄 Running K6 test with JSON output..."
        sudo docker run -i --rm \
            --network host \
            -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            /loadtest/ussd-load-test-enhanced.js | tee $LOADTEST_DIR/${TEST_NAME}-console-${TIMESTAMP}.log
        
        # Analyze results
        echo "🔍 Analyzing results..."
        cd $LOADTEST_DIR
        python3 k6-json-importer.py ${TEST_NAME}-${TIMESTAMP}.json --analyze-only
        
        # Create quick report
        echo "📄 Creating HTML report..."
        cat > ${TEST_NAME}-report-${TIMESTAMP}.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 K6 Load Test Report</h1>
        <p><strong>Test:</strong> ${TEST_NAME}</p>
        <p><strong>Timestamp:</strong> ${TIMESTAMP}</p>
    </div>
    
    <h2>📁 Generated Files</h2>
    <ul>
        <li>JSON Results: ${TEST_NAME}-${TIMESTAMP}.json</li>
        <li>Summary: ${TEST_NAME}-summary-${TIMESTAMP}.json</li>
        <li>Console Log: ${TEST_NAME}-console-${TIMESTAMP}.log</li>
    </ul>
    
    <h2>🔄 Convert to Other Formats</h2>
    <pre>
# Convert to CSV for Grafana
python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json

# Import to InfluxDB (if needed later)
python3 k6-json-importer.py ${TEST_NAME}-${TIMESTAMP}.json

# Custom analysis
cat ${TEST_NAME}-${TIMESTAMP}.json | jq '.data | select(.type=="Point")'
    </pre>
</body>
</html>
EOF
        
        echo ""
        echo "✅ Analysis completed!"
        echo "📄 HTML Report: ${TEST_NAME}-report-${TIMESTAMP}.html"
        echo "📊 JSON Results: ${TEST_NAME}-${TIMESTAMP}.json"
        ;;
        
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup completed successfully!"
echo "📁 All files are in: $LOADTEST_DIR"

# Final recommendations
echo ""
echo "💡 Recommendations:"
echo "   • Prometheus method: Best for real-time monitoring"
echo "   • Grafana Cloud: Easiest setup, no infrastructure needed"  
echo "   • CSV method: Good for offline analysis"
echo "   • JSON method: Most flexible for custom analysis"
echo ""
echo "🚀 Happy load testing!"
