#!/bin/bash

# K6 to Grafana on Linux Server - Complete Setup
# This will set up Prometheus + Grafana and run your K6 test with visualization

set -e

LOADTEST_DIR="/home/$(whoami)/loadtest"
TEST_NAME=${1:-"ussd-load-test"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🐧 K6 to Grafana Setup for Linux Server"
echo "======================================="
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script is for Linux servers only"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "⚠️  Please logout and login again, then re-run this script"
    exit 0
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create loadtest directory
mkdir -p $LOADTEST_DIR
cd $LOADTEST_DIR

echo "🚀 Choose your visualization method:"
echo ""
echo "1) Prometheus + Grafana (Real-time, Recommended)"
echo "2) JSON + CSV + Grafana CSV Plugin"
echo "3) InfluxDB + Grafana (Traditional)"
echo "4) Grafana Cloud (No local setup)"
echo ""

read -p "Select option (1-4): " -n 1 -r choice
echo ""

case $choice in
    1)
        echo "🎯 Setting up Prometheus + Grafana..."
        
        # Create docker-compose.yml for Prometheus + Grafana
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: k6-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
      - '--web.enable-remote-write-receiver'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: k6-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:
EOF

        # Create Prometheus config
        cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

# Enable remote write for K6
remote_write:
  - url: http://localhost:9090/api/v1/write
EOF

        # Create Grafana provisioning
        mkdir -p grafana/provisioning/datasources
        mkdir -p grafana/provisioning/dashboards
        mkdir -p grafana/dashboards

        # Grafana datasource config
        cat > grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

        # Grafana dashboard provisioning
        cat > grafana/provisioning/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'k6-dashboards'
    orgId: 1
    folder: 'K6 Load Testing'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

        # Start services
        echo "🚀 Starting Prometheus and Grafana..."
        docker-compose up -d

        echo "⏳ Waiting for services to start..."
        sleep 15

        # Check if services are running
        if curl -s http://localhost:9090 > /dev/null && curl -s http://localhost:3000 > /dev/null; then
            echo "✅ Services started successfully!"
        else
            echo "❌ Services failed to start. Check logs with: docker-compose logs"
            exit 1
        fi

        # Run K6 test with Prometheus output
        echo "🔄 Running K6 test with Prometheus output..."
        
        # Check if K6 test file exists
        if [ ! -f "./ussd-load-test-enhanced.js" ]; then
            echo "❌ K6 test file not found. Please copy your ussd-load-test-enhanced.js to $LOADTEST_DIR"
            exit 1
        fi

        docker run --rm --network host \
            -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out experimental-prometheus-rw=http://localhost:9090/api/v1/write \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            --tag environment=production \
            --tag version=v2.0 \
            /loadtest/ussd-load-test-enhanced.js

        echo ""
        echo "🎉 Test completed! Your data is now in Grafana!"
        echo ""
        echo "🔗 Access your dashboards:"
        echo "📊 Grafana: http://$(hostname -I | awk '{print $1}'):3000"
        echo "   Username: admin"
        echo "   Password: admin"
        echo ""
        echo "📈 Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
        echo ""
        echo "🎯 Next steps:"
        echo "1. Login to Grafana"
        echo "2. Import K6 dashboard (ID: 2587)"
        echo "3. Or create custom dashboards with your metrics"
        ;;

    2)
        echo "📊 Setting up JSON + CSV workflow..."
        
        # Run K6 with JSON output
        echo "🔄 Running K6 test with JSON output..."
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            /loadtest/ussd-load-test-enhanced.js

        # Convert to CSV (using your existing converter)
        echo "📄 Converting JSON to CSV..."
        if [ -f "./json-to-csv-converter.py" ]; then
            python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json \
                --output-prefix ${TEST_NAME}-${TIMESTAMP} \
                --create-dashboard
        else
            echo "❌ json-to-csv-converter.py not found"
            echo "📄 Your JSON data is available at: ${TEST_NAME}-${TIMESTAMP}.json"
        fi

        # Set up simple Grafana with CSV plugin
        cat > docker-compose-csv.yml << 'EOF'
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: k6-grafana-csv
    ports:
      - "3000:3000"
    volumes:
      - grafana_csv_data:/var/lib/grafana
      - ./csv-data:/var/lib/grafana/csv-data
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=marcusolsson-csv-datasource
    restart: unless-stopped

volumes:
  grafana_csv_data:
EOF

        mkdir -p csv-data
        cp *.csv csv-data/ 2>/dev/null || echo "No CSV files found yet"

        docker-compose -f docker-compose-csv.yml up -d

        echo ""
        echo "✅ CSV + Grafana setup complete!"
        echo "📊 Grafana: http://$(hostname -I | awk '{print $1}'):3000 (admin/admin)"
        echo "📁 CSV files are in: $LOADTEST_DIR/csv-data/"
        ;;

    3)
        echo "📈 Setting up InfluxDB + Grafana..."
        
        # Create InfluxDB + Grafana setup
        cat > docker-compose-influx.yml << 'EOF'
version: '3.8'

services:
  influxdb:
    image: influxdb:1.8
    container_name: k6-influxdb
    ports:
      - "8086:8086"
    environment:
      - INFLUXDB_DB=k6
      - INFLUXDB_USER=k6
      - INFLUXDB_USER_PASSWORD=k6
    volumes:
      - influxdb_data:/var/lib/influxdb

  grafana:
    image: grafana/grafana:latest
    container_name: k6-grafana-influx
    ports:
      - "3000:3000"
    volumes:
      - grafana_influx_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - influxdb

volumes:
  influxdb_data:
  grafana_influx_data:
EOF

        docker-compose -f docker-compose-influx.yml up -d

        echo "⏳ Waiting for InfluxDB to start..."
        sleep 10

        # Run K6 with InfluxDB output
        echo "🔄 Running K6 test with InfluxDB output..."
        docker run --rm --network host \
            -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out influxdb=http://localhost:8086/k6 \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            /loadtest/ussd-load-test-enhanced.js

        echo ""
        echo "✅ InfluxDB + Grafana setup complete!"
        echo "📊 Grafana: http://$(hostname -I | awk '{print $1}'):3000 (admin/admin)"
        echo "💾 InfluxDB: http://$(hostname -I | awk '{print $1}'):8086"
        ;;

    4)
        echo "☁️ Grafana Cloud setup..."
        echo ""
        echo "📋 Please provide your Grafana Cloud details:"
        read -p "Prometheus endpoint URL: " PROMETHEUS_URL
        read -p "Username: " USERNAME
        read -p "API Key: " -s API_KEY
        echo ""

        # Run K6 with Grafana Cloud
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            -e K6_PROMETHEUS_RW_SERVER_URL="$PROMETHEUS_URL" \
            -e K6_PROMETHEUS_RW_USERNAME="$USERNAME" \
            -e K6_PROMETHEUS_RW_PASSWORD="$API_KEY" \
            grafana/k6 run \
            --out experimental-prometheus-rw \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            /loadtest/ussd-load-test-enhanced.js

        echo ""
        echo "✅ Data sent to Grafana Cloud!"
        echo "☁️ View results in your Grafana Cloud dashboard"
        ;;

    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📊 Your metrics are now visualized and include:"
echo "   • Virtual Users (VUs) over time"
echo "   • Transactions Per Second (TPS)"
echo "   • Response times (P50, P90, P95, P99)"
echo "   • Error rates"
echo "   • Flow completion rates"
echo "   • Business metrics (session value, duration)"
echo ""
echo "🚀 Happy monitoring!"
