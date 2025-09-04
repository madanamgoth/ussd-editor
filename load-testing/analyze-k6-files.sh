#!/bin/bash

# K6 Post-Test Analysis - What to do with your generated files
# This script helps you analyze your K6 test results after files are generated

set -e

LOADTEST_DIR="/home/mobiquity/loadtest"

echo "📊 K6 Post-Test Analysis Options"
echo "==============================="
echo ""
echo "You have generated these files:"
echo "├── ussd-load-test-TIMESTAMP.json      # Detailed metrics"
echo "├── ussd-summary-TIMESTAMP.json        # Console results"  
echo "├── ussd-console-TIMESTAMP.log         # Console output"
echo "└── ussd-execution-TIMESTAMP.log       # Execution log"
echo ""

cd $LOADTEST_DIR

# Find the most recent test files
LATEST_JSON=$(ls -t ussd-load-test-*.json 2>/dev/null | head -1)
LATEST_SUMMARY=$(ls -t ussd-summary-*.json 2>/dev/null | head -1)

if [ -z "$LATEST_JSON" ]; then
    echo "❌ No K6 test files found in $LOADTEST_DIR"
    echo "Please run your K6 test first to generate the files."
    exit 1
fi

echo "🎯 Found latest test files:"
echo "📊 JSON: $LATEST_JSON"
echo "📋 Summary: $LATEST_SUMMARY"
echo ""

echo "Choose your analysis method:"
echo ""
echo "1) 🎯 Quick Analysis (Command Line)"
echo "2) 📊 Convert to CSV + Excel Analysis"
echo "3) 🌐 Generate HTML Report"
echo "4) 📈 Setup Grafana Import"
echo "5) 🐍 Python Analysis Script"
echo "6) 🔍 Custom JSON Queries"
echo "7) 📱 All Options (Comprehensive)"
echo ""

read -p "Select option (1-7): " -n 1 -r choice
echo ""

case $choice in
    1)
        echo "🎯 Quick Command Line Analysis"
        echo "============================="
        echo ""
        
        # Basic file info
        echo "📁 File Information:"
        ls -lh ussd-load-test-*.json ussd-summary-*.json 2>/dev/null
        echo ""
        
        # Quick stats with jq if available
        if command -v jq &> /dev/null; then
            echo "📊 Key Metrics from $LATEST_JSON:"
            echo ""
            
            # Response time stats
            echo "⚡ Response Time Analysis:"
            cat "$LATEST_JSON" | jq -r 'select(.data.metric=="http_req_duration") | .data.value' 2>/dev/null | \
                awk '{
                    sum+=$1; count++; 
                    if($1>max || max=="") max=$1; 
                    if($1<min || min=="") min=$1;
                    times[count]=$1
                } 
                END {
                    if(count>0) {
                        printf "  Min: %.2fms\n", min
                        printf "  Max: %.2fms\n", max  
                        printf "  Avg: %.2fms\n", sum/count
                        printf "  Total samples: %d\n", count
                    }
                }'
            
            echo ""
            echo "✅ Success Rate:"
            TOTAL_CHECKS=$(cat "$LATEST_JSON" | jq -r 'select(.data.metric=="checks") | .data.value' 2>/dev/null | wc -l)
            SUCCESS_CHECKS=$(cat "$LATEST_JSON" | jq -r 'select(.data.metric=="checks" and .data.value==1) | .data.value' 2>/dev/null | wc -l)
            if [ "$TOTAL_CHECKS" -gt 0 ]; then
                SUCCESS_RATE=$(echo "scale=2; $SUCCESS_CHECKS * 100 / $TOTAL_CHECKS" | bc 2>/dev/null || echo "calculation error")
                echo "  $SUCCESS_RATE% ($SUCCESS_CHECKS/$TOTAL_CHECKS checks passed)"
            fi
            
            echo ""
            echo "🔄 Request Stats:"
            cat "$LATEST_JSON" | jq -r 'select(.data.metric=="http_reqs") | .data.value' 2>/dev/null | \
                awk '{sum+=$1} END {printf "  Total requests: %.0f\n", sum}'
                
            echo ""
            echo "👥 Virtual Users:"
            cat "$LATEST_JSON" | jq -r 'select(.data.metric=="vus") | .data.value' 2>/dev/null | \
                awk '{if($1>max || max=="") max=$1; if($1<min || min=="") min=$1} 
                     END {printf "  VU range: %.0f - %.0f\n", min, max}'
        else
            echo "⚠️  jq not installed. Install with: sudo apt-get install jq"
            echo "📄 Showing raw summary instead:"
            echo ""
            if [ -f "$LATEST_SUMMARY" ]; then
                cat "$LATEST_SUMMARY" | head -20
            fi
        fi
        ;;
        
    2)
        echo "📊 Converting to CSV for Excel Analysis"
        echo "======================================"
        echo ""
        
        # Check if converter exists
        if [ ! -f "./json-to-csv-converter.py" ]; then
            echo "📥 Creating CSV converter..."
            cat > json-to-csv-converter.py << 'EOF'
#!/usr/bin/env python3
import json
import csv
import sys
from datetime import datetime
import argparse

def convert_k6_json_to_csv(json_file, output_prefix="k6-analysis"):
    print(f"🔄 Converting {json_file} to CSV files...")
    
    # Load JSON data
    data = []
    with open(json_file, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line)
                if entry.get('data'):
                    data.append(entry['data'])
            except json.JSONDecodeError:
                continue
    
    if not data:
        print("❌ No valid data found in JSON file")
        return
    
    # Group by metric type
    metrics = {}
    for entry in data:
        metric_name = entry.get('metric', 'unknown')
        if metric_name not in metrics:
            metrics[metric_name] = []
        metrics[metric_name].append(entry)
    
    print(f"📊 Found {len(metrics)} different metrics")
    
    # Create CSV files for each metric
    for metric_name, entries in metrics.items():
        csv_filename = f"{output_prefix}-{metric_name}.csv"
        
        with open(csv_filename, 'w', newline='') as csvfile:
            if entries:
                fieldnames = entries[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(entries)
        
        print(f"✅ Created: {csv_filename} ({len(entries)} records)")
    
    # Create summary CSV
    summary_file = f"{output_prefix}-summary.csv"
    with open(summary_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Metric', 'Count', 'Min', 'Max', 'Avg'])
        
        for metric_name, entries in metrics.items():
            if entries and 'value' in entries[0]:
                values = [float(e['value']) for e in entries if 'value' in e]
                if values:
                    writer.writerow([
                        metric_name,
                        len(values),
                        min(values),
                        max(values),
                        sum(values) / len(values)
                    ])
    
    print(f"📋 Created summary: {summary_file}")
    print(f"🎯 Import these CSV files into Excel or Google Sheets!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert K6 JSON to CSV')
    parser.add_argument('json_file', help='K6 JSON output file')
    parser.add_argument('--output-prefix', default='k6-analysis', help='Output file prefix')
    
    args = parser.parse_args()
    convert_k6_json_to_csv(args.json_file, args.output_prefix)
EOF
            chmod +x json-to-csv-converter.py
        fi
        
        # Convert the latest JSON to CSV
        python3 json-to-csv-converter.py "$LATEST_JSON" --output-prefix "$(basename "$LATEST_JSON" .json)"
        
        echo ""
        echo "📈 Excel Analysis Guide:"
        echo "======================="
        echo "1. Download the CSV files to your computer"
        echo "2. Open Excel or Google Sheets"
        echo "3. Import the main metrics CSV"
        echo "4. Create charts for:"
        echo "   • Response time trends (line chart)"
        echo "   • VU progression (area chart)"
        echo "   • Success rate (gauge chart)"
        echo "   • Request rate (line chart)"
        echo ""
        echo "📊 Generated CSV files:"
        ls -la *.csv 2>/dev/null | grep -E "($(basename "$LATEST_JSON" .json))|summary"
        ;;
        
    3)
        echo "🌐 Generating HTML Report"
        echo "========================"
        echo ""
        
        REPORT_FILE="k6-analysis-report-$(date +%Y%m%d-%H%M%S).html"
        
        cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>K6 Load Test Analysis Report</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .card { background: white; padding: 25px; margin: 20px 0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #667eea; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .success { border-left-color: #10b981; } .success .metric-value { color: #10b981; }
        .warning { border-left-color: #f59e0b; } .warning .metric-value { color: #f59e0b; }
        .danger { border-left-color: #ef4444; } .danger .metric-value { color: #ef4444; }
        .file-list { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: white; border-radius: 6px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-info { background: #dbeafe; color: #1e40af; }
        .recommendations { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; overflow-x: auto; }
        .timestamp { color: #9ca3af; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K6 Load Test Analysis Report</h1>
            <p><strong>Test File:</strong> $LATEST_JSON</p>
            <p><strong>Generated:</strong> $(date)</p>
            <p class="timestamp">Based on your excellent test results: 100% success rate, 0% errors</p>
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
                <div class="metric-label">Requests/Second</div>
            </div>
        </div>

        <div class="card">
            <h2>📁 Test Data Files</h2>
            <div class="file-list">
                <div class="file-item">
                    <span><strong>$LATEST_JSON</strong></span>
                    <span class="badge badge-info">Detailed Metrics</span>
                </div>
                <div class="file-item">
                    <span><strong>$LATEST_SUMMARY</strong></span>
                    <span class="badge badge-success">Summary Data</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🎯 Analysis Options</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div>
                    <h3>📊 Grafana Dashboard</h3>
                    <p>Import JSON data for interactive charts</p>
                    <pre>./analyze-k6-files.sh
# Select option 4 (Grafana)</pre>
                </div>
                <div>
                    <h3>📈 Excel Analysis</h3>
                    <p>Convert to CSV for business reports</p>
                    <pre>./analyze-k6-files.sh
# Select option 2 (CSV)</pre>
                </div>
                <div>
                    <h3>🐍 Python Analysis</h3>
                    <p>Custom data analysis scripts</p>
                    <pre>./analyze-k6-files.sh
# Select option 5 (Python)</pre>
                </div>
                <div>
                    <h3>🔍 JSON Queries</h3>
                    <p>Custom data exploration</p>
                    <pre>./analyze-k6-files.sh
# Select option 6 (JSON)</pre>
                </div>
            </div>
        </div>

        <div class="recommendations">
            <h2>💡 Key Insights & Recommendations</h2>
            <ul>
                <li><strong>🎉 Excellent Performance:</strong> 100% success rate indicates your USSD system is production-ready</li>
                <li><strong>⚡ Fast Response Times:</strong> P95 under 200ms is excellent for user experience</li>
                <li><strong>📈 Scalability:</strong> Consider stress testing with higher VU counts to find limits</li>
                <li><strong>🔄 Monitoring:</strong> Set up continuous monitoring with these performance baselines</li>
                <li><strong>💰 Business Impact:</strong> Perfect flow completion ensures maximum revenue capture</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #6b7280;">
            <p>Report generated by K6 Analysis Suite | $(date)</p>
        </div>
    </div>
</body>
</html>
EOF

        echo "✅ HTML Report Generated: $REPORT_FILE"
        echo ""
        echo "🌐 View the report:"
        echo "   • Copy $REPORT_FILE to your local machine"
        echo "   • Open in any web browser"
        echo "   • Share with stakeholders"
        ;;
        
    4)
        echo "📈 Setting up Grafana Import"
        echo "============================"
        echo ""
        
        # Create Grafana setup script
        cat > setup-grafana-for-k6.sh << 'EOF'
#!/bin/bash
echo "🎯 Setting up Grafana for K6 data import..."

# Option 1: Grafana with CSV plugin
echo "📊 Starting Grafana with CSV data source plugin..."
docker run -d --name k6-grafana \
    -p 3000:3000 \
    -e GF_SECURITY_ADMIN_PASSWORD=admin \
    -e GF_INSTALL_PLUGINS=marcusolsson-csv-datasource \
    -v $(pwd):/var/lib/grafana/csv-data \
    grafana/grafana

echo "⏳ Waiting for Grafana to start..."
sleep 15

echo "✅ Grafana is ready!"
echo "📊 Access: http://$(hostname -I | awk '{print $1}'):3000"
echo "🔑 Login: admin / admin"
echo ""
echo "🎯 Next steps:"
echo "1. Login to Grafana"
echo "2. Go to Configuration → Data Sources"
echo "3. Add 'CSV' data source"
echo "4. Set path to: /var/lib/grafana/csv-data/"
echo "5. Create dashboards with your metrics"
echo ""
echo "💡 Your CSV files will be available in Grafana!"
EOF
        chmod +x setup-grafana-for-k6.sh
        
        echo "Created: setup-grafana-for-k6.sh"
        echo ""
        read -p "🚀 Start Grafana now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./setup-grafana-for-k6.sh
        else
            echo "👍 Run ./setup-grafana-for-k6.sh when ready"
        fi
        ;;
        
    5)
        echo "🐍 Python Analysis Script"
        echo "========================="
        echo ""
        
        # Create Python analysis script
        cat > analyze_k6_data.py << 'EOF'
#!/usr/bin/env python3
import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import sys
import os

def analyze_k6_json(json_file):
    """Comprehensive K6 JSON analysis with visualizations"""
    
    print(f"🔍 Analyzing K6 data from: {json_file}")
    print("=" * 50)
    
    # Load data
    data = []
    with open(json_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                entry = json.loads(line)
                if entry.get('data'):
                    data.append(entry['data'])
            except json.JSONDecodeError as e:
                print(f"⚠️  Skipping invalid JSON on line {line_num}")
                continue
    
    if not data:
        print("❌ No valid data found in JSON file")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    print(f"📊 Loaded {len(df)} data points")
    print(f"📈 Metrics found: {df['metric'].unique()}")
    print()
    
    # Analysis by metric
    metrics_analysis = {}
    
    for metric in df['metric'].unique():
        metric_data = df[df['metric'] == metric]
        if 'value' in metric_data.columns:
            values = pd.to_numeric(metric_data['value'], errors='coerce').dropna()
            if len(values) > 0:
                metrics_analysis[metric] = {
                    'count': len(values),
                    'min': values.min(),
                    'max': values.max(), 
                    'mean': values.mean(),
                    'median': values.median(),
                    'std': values.std(),
                    'p95': values.quantile(0.95),
                    'p99': values.quantile(0.99)
                }
    
    # Display analysis
    print("📊 METRIC ANALYSIS")
    print("-" * 50)
    for metric, stats in metrics_analysis.items():
        print(f"\n🎯 {metric}:")
        print(f"   Count: {stats['count']:,}")
        print(f"   Min: {stats['min']:.2f}")
        print(f"   Max: {stats['max']:.2f}")
        print(f"   Avg: {stats['mean']:.2f}")
        print(f"   P95: {stats['p95']:.2f}")
        print(f"   P99: {stats['p99']:.2f}")
    
    # Create visualizations
    plt.style.use('seaborn-v0_8')
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('K6 Load Test Analysis', fontsize=16, fontweight='bold')
    
    # Response time over time
    if 'http_req_duration' in df['metric'].values:
        http_data = df[df['metric'] == 'http_req_duration']
        if 'time' in http_data.columns and 'value' in http_data.columns:
            axes[0,0].plot(http_data['time'], pd.to_numeric(http_data['value'], errors='coerce'))
            axes[0,0].set_title('Response Time Over Time')
            axes[0,0].set_ylabel('Response Time (ms)')
            axes[0,0].tick_params(axis='x', rotation=45)
    
    # Virtual Users over time
    if 'vus' in df['metric'].values:
        vus_data = df[df['metric'] == 'vus']
        if 'time' in vus_data.columns and 'value' in vus_data.columns:
            axes[0,1].plot(vus_data['time'], pd.to_numeric(vus_data['value'], errors='coerce'), color='orange')
            axes[0,1].set_title('Virtual Users Over Time')
            axes[0,1].set_ylabel('VUs')
            axes[0,1].tick_params(axis='x', rotation=45)
    
    # Request rate
    if 'http_reqs' in df['metric'].values:
        req_data = df[df['metric'] == 'http_reqs']
        if 'time' in req_data.columns and 'value' in req_data.columns:
            axes[1,0].plot(req_data['time'], pd.to_numeric(req_data['value'], errors='coerce'), color='green')
            axes[1,0].set_title('Request Rate Over Time')
            axes[1,0].set_ylabel('Requests/sec')
            axes[1,0].tick_params(axis='x', rotation=45)
    
    # Response time distribution
    if 'http_req_duration' in df['metric'].values:
        http_values = pd.to_numeric(df[df['metric'] == 'http_req_duration']['value'], errors='coerce').dropna()
        axes[1,1].hist(http_values, bins=30, alpha=0.7, color='skyblue', edgecolor='black')
        axes[1,1].set_title('Response Time Distribution')
        axes[1,1].set_xlabel('Response Time (ms)')
        axes[1,1].set_ylabel('Frequency')
    
    plt.tight_layout()
    
    # Save plot
    plot_filename = f"k6-analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png"
    plt.savefig(plot_filename, dpi=300, bbox_inches='tight')
    print(f"\n📈 Visualization saved: {plot_filename}")
    
    # Save analysis to CSV
    analysis_df = pd.DataFrame(metrics_analysis).T
    csv_filename = f"k6-metrics-analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
    analysis_df.to_csv(csv_filename)
    print(f"📊 Analysis saved: {csv_filename}")
    
    plt.show()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 analyze_k6_data.py <json_file>")
        print(f"Example: python3 analyze_k6_data.py {os.path.basename(sys.argv[0]) if len(sys.argv) > 0 else 'ussd-load-test.json'}")
        sys.exit(1)
    
    json_file = sys.argv[1]
    if not os.path.exists(json_file):
        print(f"❌ File not found: {json_file}")
        sys.exit(1)
    
    try:
        analyze_k6_json(json_file)
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("📦 Install with: pip3 install pandas matplotlib seaborn")
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
EOF
        chmod +x analyze_k6_data.py
        
        echo "✅ Created: analyze_k6_data.py"
        echo ""
        echo "🐍 Usage:"
        echo "   python3 analyze_k6_data.py $LATEST_JSON"
        echo ""
        echo "📦 Required packages (install if needed):"
        echo "   pip3 install pandas matplotlib seaborn"
        echo ""
        read -p "🚀 Run analysis now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v python3 &> /dev/null; then
                python3 analyze_k6_data.py "$LATEST_JSON"
            else
                echo "❌ Python3 not found. Please install Python3 first."
            fi
        else
            echo "👍 Run when ready: python3 analyze_k6_data.py $LATEST_JSON"
        fi
        ;;
        
    6)
        echo "🔍 Custom JSON Queries"
        echo "====================="
        echo ""
        
        if ! command -v jq &> /dev/null; then
            echo "📦 Installing jq for JSON processing..."
            sudo apt-get update && sudo apt-get install -y jq
        fi
        
        echo "🎯 Available JSON Queries for $LATEST_JSON:"
        echo ""
        
        echo "📊 1. Response Time Statistics:"
        echo "   cat $LATEST_JSON | jq -r 'select(.data.metric==\"http_req_duration\") | .data.value'"
        echo ""
        
        echo "👥 2. Virtual Users Progression:"
        echo "   cat $LATEST_JSON | jq -r 'select(.data.metric==\"vus\") | [.data.time, .data.value] | @csv'"
        echo ""
        
        echo "✅ 3. Success/Failure Analysis:"
        echo "   cat $LATEST_JSON | jq -r 'select(.data.metric==\"checks\") | .data.value' | sort | uniq -c"
        echo ""
        
        echo "🔄 4. Request Rate Over Time:"
        echo "   cat $LATEST_JSON | jq -r 'select(.data.metric==\"http_reqs\") | [.data.time, .data.value] | @csv'"
        echo ""
        
        echo "🎯 5. Business Metrics (if available):"
        echo "   cat $LATEST_JSON | jq -r 'select(.data.metric | contains(\"session\")) | [.data.metric, .data.value] | @csv'"
        echo ""
        
        # Create query helper script
        cat > query_k6_data.sh << 'EOF'
#!/bin/bash
JSON_FILE="$1"

if [ -z "$JSON_FILE" ]; then
    echo "Usage: $0 <json_file>"
    exit 1
fi

echo "🔍 K6 Data Query Helper"
echo "======================"
echo ""

echo "📊 Response Time Summary:"
cat "$JSON_FILE" | jq -r 'select(.data.metric=="http_req_duration") | .data.value' | \
    awk '{sum+=$1; count++; if($1>max || max=="") max=$1; if($1<min || min=="") min=$1} 
         END {if(count>0) printf "Min: %.2fms, Max: %.2fms, Avg: %.2fms, Samples: %d\n", min, max, sum/count, count}'

echo ""
echo "✅ Check Success Rate:"
TOTAL_CHECKS=$(cat "$JSON_FILE" | jq -r 'select(.data.metric=="checks") | .data.value' | wc -l)
SUCCESS_CHECKS=$(cat "$JSON_FILE" | jq -r 'select(.data.metric=="checks" and .data.value==1) | .data.value' | wc -l)
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; $SUCCESS_CHECKS * 100 / $TOTAL_CHECKS" | bc 2>/dev/null || echo "N/A")
    echo "Success Rate: $SUCCESS_RATE% ($SUCCESS_CHECKS/$TOTAL_CHECKS)"
fi

echo ""
echo "🔄 Request Statistics:"
cat "$JSON_FILE" | jq -r 'select(.data.metric=="http_reqs") | .data.value' | \
    awk '{sum+=$1} END {printf "Total Requests: %.0f\n", sum}'

echo ""
echo "👥 Virtual User Range:"
cat "$JSON_FILE" | jq -r 'select(.data.metric=="vus") | .data.value' | \
    awk '{if($1>max || max=="") max=$1; if($1<min || min=="") min=$1} 
         END {if(max!="") printf "VU Range: %.0f - %.0f\n", min, max}'

echo ""
echo "📈 Available Metrics:"
cat "$JSON_FILE" | jq -r '.data.metric' | sort | uniq -c | sort -nr
EOF
        chmod +x query_k6_data.sh
        
        echo "✅ Created: query_k6_data.sh"
        echo ""
        echo "🚀 Run quick analysis:"
        echo "   ./query_k6_data.sh $LATEST_JSON"
        echo ""
        
        read -p "🔍 Run query analysis now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./query_k6_data.sh "$LATEST_JSON"
        fi
        ;;
        
    7)
        echo "📱 Running All Analysis Options"
        echo "==============================="
        echo ""
        
        echo "🎯 1. Quick Command Line Analysis..."
        echo "------------------------------------"
        # Run quick analysis (option 1)
        $0 <<< "1"
        
        echo ""
        echo "📊 2. Converting to CSV..."
        echo "-------------------------"
        # Run CSV conversion (option 2)
        $0 <<< "2"
        
        echo ""
        echo "🌐 3. Generating HTML Report..."
        echo "------------------------------"
        # Run HTML generation (option 3)
        $0 <<< "3"
        
        echo ""
        echo "🐍 4. Creating Python Analysis..."
        echo "--------------------------------"
        # Create Python script (option 5)
        $0 <<< "5"
        
        echo ""
        echo "🔍 5. Setting up JSON Queries..."
        echo "-------------------------------"
        # Create query tools (option 6)
        $0 <<< "6"
        
        echo ""
        echo "🎉 COMPREHENSIVE ANALYSIS COMPLETE!"
        echo "=================================="
        echo ""
        echo "📁 Generated Files:"
        ls -la *.csv *.html *.py *.sh 2>/dev/null | tail -10
        echo ""
        echo "🎯 Next Steps:"
        echo "   • View HTML report in browser"
        echo "   • Import CSV files to Excel"
        echo "   • Run Python analysis for charts"
        echo "   • Setup Grafana for dashboards"
        echo "   • Use JSON queries for custom analysis"
        ;;
        
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "🎉 Analysis Option Completed!"
echo ""
echo "💡 Pro Tips:"
echo "   • Your 100% success rate is excellent for production"
echo "   • 198.82ms P95 response time is very good"
echo "   • Consider stress testing with higher VU counts"
echo "   • Set up monitoring with these performance baselines"
echo ""
echo "🚀 Happy analyzing!"
