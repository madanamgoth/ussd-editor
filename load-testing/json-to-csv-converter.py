#!/usr/bin/env python3
"""
K6 JSON to CSV Converter for Grafana CSV Plugin
Converts K6 JSON output to CSV format for direct Grafana import
"""

import json
import csv
import argparse
import sys
from datetime import datetime
import pandas as pd

def json_to_csv(json_file, output_prefix="k6-metrics"):
    """
    Convert K6 JSON output to multiple CSV files by metric type
    """
    metrics_data = {}
    
    print(f"🔄 Processing {json_file}...")
    
    try:
        with open(json_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    
                    if data.get('type') == 'Point':
                        metric_name = data['metric']
                        point_data = data['data']
                        
                        # Initialize metric data structure
                        if metric_name not in metrics_data:
                            metrics_data[metric_name] = []
                        
                        # Extract data
                        row = {
                            'timestamp': point_data['time'],
                            'value': point_data['value'],
                            **point_data.get('tags', {})
                        }
                        
                        metrics_data[metric_name].append(row)
                        
                    if line_num % 10000 == 0:
                        print(f"📊 Processed {line_num} lines...")
                        
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    if line_num <= 10:  # Only show first 10 errors
                        print(f"⚠️  Error processing line {line_num}: {e}")
                    continue
    
    except FileNotFoundError:
        print(f"❌ File not found: {json_file}")
        return False
    
    # Convert each metric to CSV
    csv_files = []
    
    for metric_name, data_points in metrics_data.items():
        if not data_points:
            continue
            
        csv_filename = f"{output_prefix}_{metric_name}.csv"
        
        # Convert to DataFrame for easier handling
        df = pd.DataFrame(data_points)
        
        # Convert timestamp to proper format
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Save to CSV
        df.to_csv(csv_filename, index=False)
        csv_files.append(csv_filename)
        
        print(f"✅ Created {csv_filename} with {len(data_points)} data points")
    
    return csv_files

def create_grafana_csv_dashboard(csv_files, output_file="grafana-csv-dashboard.json"):
    """
    Create a Grafana dashboard JSON for CSV data sources
    """
    
    dashboard = {
        "dashboard": {
            "id": None,
            "title": "K6 Load Test Results (CSV)",
            "tags": ["k6", "csv", "load-testing"],
            "timezone": "browser",
            "refresh": "5s",
            "time": {
                "from": "now-1h",
                "to": "now"
            },
            "panels": [],
            "templating": {
                "list": []
            },
            "annotations": {
                "list": []
            },
            "schemaVersion": 30,
            "version": 1
        }
    }
    
    panel_id = 1
    y_pos = 0
    
    # Create panels for key metrics
    key_metrics = [
        "http_req_duration",
        "http_reqs", 
        "vus",
        "errors",
        "flow_completion",
        "step_response_time"
    ]
    
    for metric in key_metrics:
        csv_file = f"k6-metrics_{metric}.csv"
        if csv_file in csv_files:
            panel = {
                "id": panel_id,
                "title": f"📊 {metric.replace('_', ' ').title()}",
                "type": "timeseries",
                "gridPos": {
                    "h": 8,
                    "w": 12,
                    "x": (panel_id - 1) % 2 * 12,
                    "y": y_pos
                },
                "targets": [
                    {
                        "datasource": f"CSV - {metric}",
                        "refId": "A"
                    }
                ],
                "fieldConfig": {
                    "defaults": {
                        "custom": {
                            "drawStyle": "line",
                            "lineInterpolation": "linear",
                            "barAlignment": 0,
                            "lineWidth": 1,
                            "fillOpacity": 0,
                            "gradientMode": "none",
                            "spanNulls": False,
                            "insertNulls": False,
                            "showPoints": "auto",
                            "pointSize": 5
                        }
                    }
                }
            }
            
            dashboard["dashboard"]["panels"].append(panel)
            panel_id += 1
            
            if panel_id % 2 == 1:
                y_pos += 8
    
    # Save dashboard JSON
    with open(output_file, 'w') as f:
        json.dump(dashboard, f, indent=2)
    
    print(f"📊 Created Grafana dashboard: {output_file}")
    return output_file

def create_single_csv(json_file, output_file="k6-results-combined.csv"):
    """
    Create a single CSV file with all metrics (alternative approach)
    """
    
    all_data = []
    
    print(f"🔄 Creating combined CSV from {json_file}...")
    
    try:
        with open(json_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    
                    if data.get('type') == 'Point':
                        point_data = data['data']
                        
                        # Flatten the data
                        row = {
                            'timestamp': point_data['time'],
                            'metric': data['metric'],
                            'value': point_data['value'],
                        }
                        
                        # Add tags as separate columns
                        tags = point_data.get('tags', {})
                        for tag_key, tag_value in tags.items():
                            row[f"tag_{tag_key}"] = tag_value
                        
                        all_data.append(row)
                        
                    if line_num % 10000 == 0:
                        print(f"📊 Processed {line_num} lines...")
                        
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    continue
    
    except FileNotFoundError:
        print(f"❌ File not found: {json_file}")
        return False
    
    # Convert to DataFrame and save
    df = pd.DataFrame(all_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    df.to_csv(output_file, index=False)
    print(f"✅ Created combined CSV: {output_file} with {len(all_data)} rows")
    
    return output_file

def main():
    parser = argparse.ArgumentParser(description='Convert K6 JSON to CSV for Grafana')
    parser.add_argument('json_file', help='K6 JSON results file')
    parser.add_argument('--output-prefix', default='k6-metrics', help='Output CSV file prefix')
    parser.add_argument('--single-csv', action='store_true', help='Create single combined CSV file')
    parser.add_argument('--create-dashboard', action='store_true', help='Create Grafana dashboard JSON')
    
    args = parser.parse_args()
    
    print("📊 K6 JSON to CSV Converter")
    print("=" * 40)
    
    if args.single_csv:
        # Create single combined CSV
        csv_file = create_single_csv(args.json_file, f"{args.output_prefix}-combined.csv")
        if csv_file:
            print(f"\n✅ Conversion completed!")
            print(f"📁 CSV file: {csv_file}")
            print(f"\n🎯 Next steps:")
            print(f"1. Install Grafana CSV plugin: grafana-cli plugins install marcusolsson-csv-datasource")
            print(f"2. Add CSV data source in Grafana")
            print(f"3. Point to: {csv_file}")
            print(f"4. Create visualizations")
    else:
        # Create separate CSV files per metric
        csv_files = json_to_csv(args.json_file, args.output_prefix)
        
        if csv_files:
            print(f"\n✅ Conversion completed!")
            print(f"📁 Created {len(csv_files)} CSV files:")
            for csv_file in csv_files:
                print(f"   📄 {csv_file}")
            
            if args.create_dashboard:
                dashboard_file = create_grafana_csv_dashboard(csv_files)
                print(f"📊 Dashboard: {dashboard_file}")
            
            print(f"\n🎯 Next steps:")
            print(f"1. Install Grafana CSV plugin")
            print(f"2. Add CSV data sources for each metric")
            print(f"3. Import dashboard JSON (if created)")
            print(f"4. Start analyzing your K6 results!")

if __name__ == "__main__":
    main()
