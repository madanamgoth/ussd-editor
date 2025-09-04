#!/bin/bash
# 🔧 K6 InfluxDB Connection Verification Script

echo "🚀 K6 → InfluxDB → Grafana Connection Test"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test InfluxDB connection
echo -e "\n${BLUE}📊 Step 1: Testing InfluxDB Connection...${NC}"
if curl -s http://localhost:8086/ping > /dev/null; then
    echo -e "${GREEN}✅ InfluxDB is running and accessible${NC}"
else
    echo -e "${RED}❌ InfluxDB is not accessible at http://localhost:8086${NC}"
    echo -e "${YELLOW}💡 Start InfluxDB: sudo systemctl start influxdb${NC}"
    exit 1
fi

# Check if K6 database exists
echo -e "\n${BLUE}🗄️ Step 2: Checking K6 Database...${NC}"
DB_CHECK=$(curl -s -G 'http://localhost:8086/query' --data-urlencode "q=SHOW DATABASES" | grep -o '"k6"')
if [ "$DB_CHECK" == '"k6"' ]; then
    echo -e "${GREEN}✅ K6 database exists in InfluxDB${NC}"
else
    echo -e "${YELLOW}⚠️  Creating K6 database...${NC}"
    curl -s -POST 'http://localhost:8086/query' --data-urlencode "q=CREATE DATABASE k6" > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ K6 database created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create K6 database${NC}"
        exit 1
    fi
fi

# Test Grafana connection
echo -e "\n${BLUE}📊 Step 3: Testing Grafana Connection...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Grafana is running and accessible${NC}"
else
    echo -e "${RED}❌ Grafana is not accessible at http://localhost:3000${NC}"
    echo -e "${YELLOW}💡 Start Grafana: sudo systemctl start grafana-server${NC}"
fi

# Test K6 with InfluxDB output (short test)
echo -e "\n${BLUE}🔧 Step 4: Testing K6 → InfluxDB Integration...${NC}"

# Create a minimal K6 test script
cat > /tmp/k6-influxdb-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 1 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

export default function() {
  const response = http.get('https://httpbin.org/json');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
EOF

echo -e "${YELLOW}🔄 Running 10-second K6 test with InfluxDB output...${NC}"

# Run K6 test with InfluxDB output
if k6 run --out influxdb=http://localhost:8086/k6 --tag test=connection_verify /tmp/k6-influxdb-test.js; then
    echo -e "${GREEN}✅ K6 test completed successfully with InfluxDB output${NC}"
else
    echo -e "${RED}❌ K6 test failed${NC}"
    echo -e "${YELLOW}💡 Check if k6 is installed: k6 version${NC}"
    exit 1
fi

# Verify data was written to InfluxDB
echo -e "\n${BLUE}🔍 Step 5: Verifying Data in InfluxDB...${NC}"
sleep 2  # Wait for data to be written

MEASUREMENT_COUNT=$(curl -s -G 'http://localhost:8086/query' \
  --data-urlencode "db=k6" \
  --data-urlencode "q=SHOW MEASUREMENTS" | grep -c '"name"')

if [ "$MEASUREMENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Data successfully written to InfluxDB${NC}"
    echo -e "${GREEN}📊 Found $MEASUREMENT_COUNT measurement types${NC}"
    
    # Show some sample measurements
    echo -e "\n${BLUE}📋 Sample Measurements in K6 Database:${NC}"
    curl -s -G 'http://localhost:8086/query' \
      --data-urlencode "db=k6" \
      --data-urlencode "q=SHOW MEASUREMENTS" | \
      grep -o '"[^"]*"' | head -10 | sed 's/"//g' | while read measurement; do
        echo "  • $measurement"
    done
    
    # Show record count
    HTTP_REQS=$(curl -s -G 'http://localhost:8086/query' \
      --data-urlencode "db=k6" \
      --data-urlencode "q=SELECT COUNT(*) FROM http_reqs WHERE test='connection_verify'" | \
      grep -o '"count":[0-9]*' | cut -d: -f2)
    
    if [ ! -z "$HTTP_REQS" ] && [ "$HTTP_REQS" -gt 0 ]; then
        echo -e "${GREEN}📈 HTTP requests recorded: $HTTP_REQS${NC}"
    fi
else
    echo -e "${RED}❌ No data found in InfluxDB${NC}"
    echo -e "${YELLOW}💡 Check InfluxDB logs: journalctl -u influxdb${NC}"
fi

# Clean up test file
rm -f /tmp/k6-influxdb-test.js

echo -e "\n${BLUE}🎯 Summary & Next Steps:${NC}"
echo "=============================================="
echo -e "1. ${GREEN}InfluxDB:${NC} http://localhost:8086 (Database: k6)"
echo -e "2. ${GREEN}Grafana:${NC} http://localhost:3000" 
echo -e "3. ${GREEN}Import K6 Dashboard:${NC} Dashboard ID 2587"
echo -e "4. ${GREEN}K6 Command:${NC} k6 run --out influxdb=http://localhost:8086/k6 your-script.js"

echo -e "\n${GREEN}✅ Your K6 → InfluxDB → Grafana pipeline is ready!${NC}"
echo -e "${BLUE}🚀 Run your USSD load test with InfluxDB output now!${NC}"
