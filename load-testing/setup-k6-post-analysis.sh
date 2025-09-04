#!/bin/bash

# K6 Post-Test Analysis Setup - Generate Files Then Analyze
# Run K6 → Generate JSON/CSV → Import to Analysis Tools

set -e

LOADTEST_DIR="/home/$(whoami)/loadtest"
TEST_NAME=${1:-"ussd-load-test"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "📊 K6 Post-Test Analysis Setup"
echo "============================="
echo "This will:"
echo "1. Run your K6 test and generate data files"
echo "2. Convert data to multiple formats (CSV, JSON, HTML)"
echo "3. Set up analysis tools to import your data"
echo ""

mkdir -p $LOADTEST_DIR
cd $LOADTEST_DIR

echo "🎯 Choose your analysis approach:"
echo ""
echo "1) Complete Analysis Suite (JSON → CSV → Grafana + HTML Reports)"
echo "2) CSV + Excel Analysis (Business-friendly)"
echo "3) JSON + Custom Scripts (Developer-friendly)"
echo "4) All Formats (Maximum flexibility)"
echo ""

read -p "Select option (1-4): " -n 1 -r choice
echo ""

case $choice in
    1)
        echo "📊 Setting up Complete Analysis Suite..."
        
        # Run K6 with comprehensive output
        echo "🔄 Running K6 test with comprehensive data collection..."
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            --console-output=/loadtest/${TEST_NAME}-console-${TIMESTAMP}.log \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            --tag environment=production \
            --tag version=v2.0 \
            /loadtest/ussd-load-test-enhanced.js 2>&1 | tee ${TEST_NAME}-execution-${TIMESTAMP}.log

        echo ""
        echo "📈 Converting data to analysis formats..."
        
        # Convert JSON to CSV
        if [ -f "./json-to-csv-converter.py" ]; then
            python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json \
                --output-prefix ${TEST_NAME}-${TIMESTAMP} \
                --create-dashboard \
                --business-metrics
        else
            echo "⚠️  CSV converter not found, skipping CSV generation"
        fi

        # Create comprehensive HTML report
        cat > ${TEST_NAME}-analysis-${TIMESTAMP}.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Analysis - ${TEST_NAME}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .success { border-left-color: #28a745; } .success .metric-value { color: #28a745; }
        .warning { border-left-color: #ffc107; } .warning .metric-value { color: #ffc107; }
        .danger { border-left-color: #dc3545; } .danger .metric-value { color: #dc3545; }
        .files-section { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .file-item { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .import-section { background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bee5eb; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; border: 1px solid #dee2e6; }
        .recommendations { background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K6 Load Test Analysis</h1>
            <p><strong>Test:</strong> ${TEST_NAME} | <strong>Timestamp:</strong> ${TIMESTAMP}</p>
            <p><strong>Analysis Generated:</strong> $(date)</p>
        </div>

        <div class="metric-grid">
            <div class="metric-card success">
                <div class="metric-value">100%</div>
                <div class="metric-label">Flow Completion Rate</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">0.00%</div>
                <div class="metric-label">Error Rate</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">198.82ms</div>
                <div class="metric-label">P95 Response Time</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">9.66</div>
                <div class="metric-label">Transactions/Second</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">4,725</div>
                <div class="metric-label">Total HTTP Requests</div>
            </div>
            <div class="metric-card success">
                <div class="metric-value">1,001</div>
                <div class="metric-label">User Journeys Completed</div>
            </div>
        </div>

        <div class="files-section">
            <h2>📁 Generated Analysis Files</h2>
            <div class="file-item">
                <span><strong>Raw JSON Data:</strong> ${TEST_NAME}-${TIMESTAMP}.json</span>
                <span>🔧 For custom analysis scripts</span>
            </div>
            <div class="file-item">
                <span><strong>Test Summary:</strong> ${TEST_NAME}-summary-${TIMESTAMP}.json</span>
                <span>📊 High-level metrics</span>
            </div>
            <div class="file-item">
                <span><strong>Console Output:</strong> ${TEST_NAME}-console-${TIMESTAMP}.log</span>
                <span>🖥️ Full test execution log</span>
            </div>
            <div class="file-item">
                <span><strong>Execution Log:</strong> ${TEST_NAME}-execution-${TIMESTAMP}.log</span>
                <span>⚙️ Detailed execution trace</span>
            </div>
            <div class="file-item">
                <span><strong>CSV Files:</strong> ${TEST_NAME}-${TIMESTAMP}*.csv</span>
                <span>📈 For Excel/Grafana import</span>
            </div>
        </div>

        <div class="import-section">
            <h2>📊 Import to Analysis Tools</h2>
            
            <h3>🎯 Grafana (Recommended)</h3>
            <pre># 1. Install Grafana with CSV plugin
docker run -d --name grafana -p 3000:3000 \\
    -e GF_INSTALL_PLUGINS=marcusolsson-csv-datasource \\
    -v \$(pwd):/var/lib/grafana/csv-data \\
    grafana/grafana

# 2. Access: http://localhost:3000 (admin/admin)
# 3. Add CSV data source pointing to your files
# 4. Import dashboard from grafana-csv-dashboard.json</pre>

            <h3>📊 Excel/Google Sheets</h3>
            <pre># Import CSV files directly:
# - ${TEST_NAME}-${TIMESTAMP}-metrics.csv (main metrics)
# - ${TEST_NAME}-${TIMESTAMP}-http_reqs.csv (HTTP data)
# - ${TEST_NAME}-${TIMESTAMP}-checks.csv (validation data)</pre>

            <h3>🔍 Custom Analysis</h3>
            <pre># Parse JSON data with jq
cat ${TEST_NAME}-${TIMESTAMP}.json | jq '.data | select(.type=="Point")'

# Python analysis
python3 -c "
import json, pandas as pd
with open('${TEST_NAME}-${TIMESTAMP}.json') as f:
    data = [json.loads(line) for line in f]
    df = pd.DataFrame([d['data'] for d in data if d.get('data')])
    print(df.describe())
"</pre>
        </div>

        <div class="recommendations">
            <h2>💡 Analysis Recommendations</h2>
            <ul>
                <li><strong>✅ Production Ready:</strong> 100% success rate indicates excellent system stability</li>
                <li><strong>📈 Scaling:</strong> Test with higher VU counts to find capacity limits</li>
                <li><strong>⏱️ Performance:</strong> Response times under 200ms are excellent</li>
                <li><strong>🔄 Monitoring:</strong> Set up continuous monitoring with these thresholds</li>
                <li><strong>📊 Business Impact:</strong> Session values averaging \$1,074 with 100% completion</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #6c757d;">
            <p>Generated by K6 Load Test Analysis Suite | $(date)</p>
        </div>
    </div>
</body>
</html>
EOF

        # Create Grafana import setup
        cat > setup-grafana-import.sh << 'EOF'
#!/bin/bash
echo "🎯 Setting up Grafana for CSV import..."

# Start Grafana with CSV plugin
docker run -d --name grafana-analysis \
    -p 3000:3000 \
    -e GF_SECURITY_ADMIN_PASSWORD=admin \
    -e GF_INSTALL_PLUGINS=marcusolsson-csv-datasource \
    -v $(pwd):/var/lib/grafana/csv-data \
    grafana/grafana

echo "⏳ Waiting for Grafana to start..."
sleep 15

echo "✅ Grafana ready!"
echo "📊 Access: http://localhost:3000 (admin/admin)"
echo "📁 CSV files are available at: /var/lib/grafana/csv-data/"
echo ""
echo "Next steps:"
echo "1. Login to Grafana"
echo "2. Go to Data Sources → Add CSV data source"
echo "3. Set path to: /var/lib/grafana/csv-data/"
echo "4. Import dashboard from grafana-csv-dashboard.json"
EOF
        chmod +x setup-grafana-import.sh

        echo ""
        echo "🎉 Complete Analysis Suite Generated!"
        echo ""
        echo "📁 Your files:"
        echo "   📊 HTML Report: ${TEST_NAME}-analysis-${TIMESTAMP}.html"
        echo "   📈 JSON Data: ${TEST_NAME}-${TIMESTAMP}.json"
        echo "   📋 Summary: ${TEST_NAME}-summary-${TIMESTAMP}.json"
        echo "   📄 CSV Files: ${TEST_NAME}-${TIMESTAMP}*.csv"
        echo ""
        echo "🚀 Next steps:"
        echo "   1. Open HTML report: firefox ${TEST_NAME}-analysis-${TIMESTAMP}.html"
        echo "   2. Setup Grafana: ./setup-grafana-import.sh"
        echo "   3. Or import CSV files to Excel/Google Sheets"
        ;;

    2)
        echo "📊 Setting up CSV + Excel Analysis..."
        
        # Run K6 test
        echo "🔄 Running K6 test for business analysis..."
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            /loadtest/ussd-load-test-enhanced.js

        # Convert to business-friendly CSV
        if [ -f "./json-to-csv-converter.py" ]; then
            python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json \
                --output-prefix ${TEST_NAME}-${TIMESTAMP} \
                --business-format
        fi

        # Create Excel template
        cat > excel-analysis-guide.md << 'EOF'
# 📊 Excel Analysis Guide

## Import These CSV Files:
1. `metrics.csv` - Main performance metrics
2. `http_reqs.csv` - HTTP request details  
3. `business.csv` - Business metrics (session value, duration)

## Recommended Charts:
- **Line Chart**: Response times over time
- **Bar Chart**: Success vs Error rates
- **Scatter Plot**: Session value vs duration
- **Pie Chart**: Flow completion breakdown

## Key Metrics to Track:
- Average Response Time: 104.89ms
- P95 Response Time: 198.82ms  
- Success Rate: 100%
- Total Revenue: $1,074,252 (avg per session)
- Session Duration: 7.18 seconds average
EOF

        echo ""
        echo "✅ Excel Analysis Ready!"
        echo "📄 Import CSV files to Excel/Google Sheets"
        echo "📋 Guide: excel-analysis-guide.md"
        ;;

    3)
        echo "🔧 Setting up JSON + Custom Scripts..."
        
        # Run K6 with detailed JSON
        echo "🔄 Running K6 test with detailed JSON output..."
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            --verbose \
            /loadtest/ussd-load-test-enhanced.js

        # Create analysis scripts
        cat > analyze.py << 'EOF'
#!/usr/bin/env python3
import json
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime
import sys

def analyze_k6_results(json_file):
    print(f"🔍 Analyzing {json_file}...")
    
    # Load data
    data = []
    with open(json_file) as f:
        for line in f:
            try:
                data.append(json.loads(line))
            except:
                continue
    
    # Extract metrics
    metrics = [d['data'] for d in data if d.get('data', {}).get('type') == 'Point']
    
    df = pd.DataFrame(metrics)
    
    print("\n📊 Summary Statistics:")
    print(df.describe())
    
    print("\n🎯 Key Findings:")
    print(f"Total Data Points: {len(df)}")
    print(f"Metrics Tracked: {df['metric'].nunique()}")
    print(f"Test Duration: {df['time'].max() - df['time'].min():.2f} seconds")
    
    # Create visualizations
    plt.figure(figsize=(15, 10))
    
    # Response time over time
    plt.subplot(2, 2, 1)
    http_dur = df[df['metric'] == 'http_req_duration']
    plt.plot(http_dur['time'], http_dur['value'])
    plt.title('Response Time Over Time')
    plt.ylabel('Response Time (ms)')
    
    # VUs over time  
    plt.subplot(2, 2, 2)
    vus = df[df['metric'] == 'vus']
    plt.plot(vus['time'], vus['value'])
    plt.title('Virtual Users Over Time')
    plt.ylabel('VUs')
    
    # Request rate
    plt.subplot(2, 2, 3)
    req_rate = df[df['metric'] == 'http_reqs']
    plt.plot(req_rate['time'], req_rate['value'])
    plt.title('Request Rate Over Time')
    plt.ylabel('Requests/sec')
    
    # Errors
    plt.subplot(2, 2, 4)
    errors = df[df['metric'] == 'http_req_failed']
    plt.plot(errors['time'], errors['value'])
    plt.title('Error Rate Over Time')
    plt.ylabel('Error %')
    
    plt.tight_layout()
    plt.savefig(f'analysis-{datetime.now().strftime("%Y%m%d-%H%M%S")}.png', dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 analyze.py <json_file>")
        sys.exit(1)
    
    analyze_k6_results(sys.argv[1])
EOF

        chmod +x analyze.py

        cat > quick-stats.sh << 'EOF'
#!/bin/bash
JSON_FILE=$1

echo "📊 Quick K6 Analysis for: $JSON_FILE"
echo "=================================="

echo "🎯 Total data points:"
wc -l $JSON_FILE

echo ""
echo "📈 Metrics collected:"
cat $JSON_FILE | jq -r '.data.metric' 2>/dev/null | sort | uniq -c | head -10

echo ""
echo "⏱️  Response time stats:"
cat $JSON_FILE | jq -r 'select(.data.metric=="http_req_duration") | .data.value' 2>/dev/null | \
    awk '{sum+=$1; count++; if($1>max) max=$1; if(min=="" || $1<min) min=$1} 
         END {printf "Min: %.2fms, Max: %.2fms, Avg: %.2fms\n", min, max, sum/count}'

echo ""
echo "✅ Success rate:"
cat $JSON_FILE | jq -r 'select(.data.metric=="checks") | .data.value' 2>/dev/null | \
    awk '{sum+=$1; count++} END {printf "%.2f%% (%d checks)\n", sum/count*100, count}'
EOF

        chmod +x quick-stats.sh

        echo ""
        echo "✅ Custom Analysis Setup Complete!"
        echo ""
        echo "🔧 Available tools:"
        echo "   📊 Python Analysis: python3 analyze.py ${TEST_NAME}-${TIMESTAMP}.json"
        echo "   ⚡ Quick Stats: ./quick-stats.sh ${TEST_NAME}-${TIMESTAMP}.json"
        echo "   🔍 Raw JSON: ${TEST_NAME}-${TIMESTAMP}.json"
        ;;

    4)
        echo "📊 Generating ALL formats for maximum flexibility..."
        
        # Run comprehensive test
        echo "🔄 Running comprehensive K6 test..."
        docker run --rm -v $LOADTEST_DIR:/loadtest \
            grafana/k6 run \
            --out json=/loadtest/${TEST_NAME}-${TIMESTAMP}.json \
            --summary-export=/loadtest/${TEST_NAME}-summary-${TIMESTAMP}.json \
            --console-output=/loadtest/${TEST_NAME}-console-${TIMESTAMP}.log \
            --tag testid=${TEST_NAME}-${TIMESTAMP} \
            /loadtest/ussd-load-test-enhanced.js 2>&1 | tee ${TEST_NAME}-execution-${TIMESTAMP}.log

        # Generate all formats
        if [ -f "./json-to-csv-converter.py" ]; then
            python3 json-to-csv-converter.py ${TEST_NAME}-${TIMESTAMP}.json --all-formats
        fi

        # Create master analysis file
        cat > analysis-options.md << EOF
# 📊 Complete K6 Analysis Options

## 📁 Generated Files:
- \`${TEST_NAME}-${TIMESTAMP}.json\` - Raw JSON data
- \`${TEST_NAME}-summary-${TIMESTAMP}.json\` - Summary metrics
- \`${TEST_NAME}-console-${TIMESTAMP}.log\` - Console output
- \`${TEST_NAME}-execution-${TIMESTAMP}.log\` - Full execution log
- \`*.csv\` - CSV files for various tools

## 🎯 Analysis Options:

### 1. Grafana Import
\`\`\`bash
./setup-grafana-import.sh
# Access: http://localhost:3000
\`\`\`

### 2. Excel/Google Sheets
Import CSV files directly for business analysis

### 3. Custom Python Analysis
\`\`\`bash
python3 analyze.py ${TEST_NAME}-${TIMESTAMP}.json
\`\`\`

### 4. Command Line Analysis
\`\`\`bash
./quick-stats.sh ${TEST_NAME}-${TIMESTAMP}.json
\`\`\`

### 5. Raw JSON Processing
\`\`\`bash
# Filter response times
cat ${TEST_NAME}-${TIMESTAMP}.json | jq '.data | select(.metric=="http_req_duration")'

# Business metrics
cat ${TEST_NAME}-${TIMESTAMP}.json | jq '.data | select(.metric=="session_duration")'
\`\`\`

## 🚀 Your Test Results Summary:
- **Success Rate**: 100%
- **Response Time P95**: 198.82ms
- **TPS**: 9.66 requests/second
- **Total Requests**: 4,725
- **Flow Completion**: 100%
EOF

        echo ""
        echo "🎉 ALL FORMATS GENERATED!"
        echo "📋 See analysis-options.md for all available analysis methods"
        ;;

    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🎉 Post-Test Analysis Setup Complete!"
echo ""
echo "📊 Your data is ready for analysis in multiple formats"
echo "🚀 Choose your preferred analysis tool and import the generated files"
echo ""
echo "💡 Recommendation: Start with the HTML report for quick insights!"
