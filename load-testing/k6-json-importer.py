#!/usr/bin/env python3
"""
K6 JSON to InfluxDB Importer
Converts K6 JSON output to InfluxDB for Grafana analysis
"""

import json
import requests
import argparse
import sys
from datetime import datetime
import time

def import_k6_json_to_influxdb(json_file, influxdb_url="http://127.0.0.1:8086", database="k6", batch_size=1000):
    """
    Import K6 JSON results to InfluxDB
    """
    url = f"{influxdb_url}/write?db={database}&precision=ns"
    
    # Test InfluxDB connection
    try:
        ping_response = requests.get(f"{influxdb_url}/ping")
        if ping_response.status_code != 204:
            print(f"❌ InfluxDB not accessible at {influxdb_url}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to InfluxDB: {e}")
        return False
    
    print(f"✅ Connected to InfluxDB at {influxdb_url}")
    print(f"📊 Importing to database: {database}")
    print(f"📁 Processing file: {json_file}")
    
    batch = []
    total_points = 0
    error_count = 0
    
    try:
        with open(json_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    
                    if data.get('type') == 'Point':
                        metric_name = data['metric']
                        point_data = data['data']
                        
                        # Convert timestamp to nanoseconds
                        timestamp_str = point_data['time']
                        if timestamp_str.endswith('Z'):
                            timestamp_str = timestamp_str[:-1] + '+00:00'
                        
                        timestamp = datetime.fromisoformat(timestamp_str)
                        timestamp_ns = int(timestamp.timestamp() * 1e9)
                        
                        # Build tags - escape special characters
                        tags = point_data.get('tags', {})
                        tag_pairs = []
                        for k, v in tags.items():
                            if v and str(v).strip():
                                # Escape special characters in tag values
                                escaped_value = str(v).replace(' ', '\\ ').replace(',', '\\,').replace('=', '\\=')
                                tag_pairs.append(f"{k}={escaped_value}")
                        
                        tag_str = ','.join(tag_pairs)
                        
                        # Build line protocol
                        if tag_str:
                            line_protocol = f"{metric_name},{tag_str} value={point_data['value']} {timestamp_ns}"
                        else:
                            line_protocol = f"{metric_name} value={point_data['value']} {timestamp_ns}"
                        
                        batch.append(line_protocol)
                        total_points += 1
                        
                        # Send batch when full
                        if len(batch) >= batch_size:
                            success = send_batch(url, batch, line_num)
                            if success:
                                print(f"📈 Imported batch: {total_points} points processed")
                            else:
                                error_count += len(batch)
                            batch = []
                            
                except json.JSONDecodeError:
                    # Skip non-JSON lines (like console output)
                    continue
                except Exception as e:
                    error_count += 1
                    if error_count <= 10:  # Only show first 10 errors
                        print(f"⚠️  Error processing line {line_num}: {e}")
                    continue
        
        # Send remaining batch
        if batch:
            success = send_batch(url, batch, line_num)
            if success:
                print(f"📈 Final batch imported")
            else:
                error_count += len(batch)
    
    except FileNotFoundError:
        print(f"❌ File not found: {json_file}")
        return False
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False
    
    print(f"\n🎯 Import Summary:")
    print(f"   Total data points: {total_points}")
    print(f"   Errors: {error_count}")
    print(f"   Success rate: {((total_points-error_count)/total_points)*100:.1f}%" if total_points > 0 else "N/A")
    
    return True

def send_batch(url, batch, line_num):
    """Send a batch of data points to InfluxDB"""
    try:
        payload = '\n'.join(batch)
        response = requests.post(url, data=payload, timeout=30)
        
        if response.status_code == 204:
            return True
        else:
            print(f"❌ InfluxDB error {response.status_code}: {response.text[:100]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⏰ Timeout sending batch at line {line_num}")
        return False
    except Exception as e:
        print(f"❌ Network error: {e}")
        return False

def analyze_json_file(json_file):
    """Quick analysis of K6 JSON file"""
    print(f"🔍 Analyzing {json_file}...")
    
    metrics_count = {}
    response_times = []
    errors = 0
    total_requests = 0
    scenarios = set()
    
    try:
        with open(json_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    if data.get('type') == 'Point':
                        metric = data['metric']
                        value = data['data']['value']
                        tags = data['data'].get('tags', {})
                        
                        # Count metrics
                        metrics_count[metric] = metrics_count.get(metric, 0) + 1
                        
                        # Collect specific data
                        if metric == 'http_req_duration':
                            response_times.append(value)
                        elif metric == 'errors':
                            errors += value
                        elif metric == 'http_reqs':
                            total_requests += value
                            
                        # Collect scenario names
                        if 'scenario_name' in tags:
                            scenarios.add(tags['scenario_name'])
                        elif 'scenario' in tags:
                            scenarios.add(tags['scenario'])
                            
                except:
                    continue
    
    except FileNotFoundError:
        print(f"❌ File not found: {json_file}")
        return
    
    print(f"\n📊 File Analysis:")
    print(f"   File size: {get_file_size(json_file)}")
    print(f"   Metrics found: {len(metrics_count)}")
    print(f"   Total data points: {sum(metrics_count.values())}")
    print(f"   Scenarios: {len(scenarios)}")
    
    if response_times:
        response_times.sort()
        count = len(response_times)
        print(f"\n⏱️  Response Time Analysis:")
        print(f"   Count: {count}")
        print(f"   Average: {sum(response_times)/count:.2f}ms")
        print(f"   Median: {response_times[count//2]:.2f}ms")
        print(f"   P95: {response_times[int(count*0.95)]:.2f}ms")
        print(f"   P99: {response_times[int(count*0.99)]:.2f}ms")
    
    if total_requests > 0:
        print(f"\n📈 Request Analysis:")
        print(f"   Total requests: {total_requests}")
        print(f"   Total errors: {errors}")
        print(f"   Error rate: {(errors/total_requests)*100:.2f}%")
    
    print(f"\n📋 Available Metrics:")
    for metric, count in sorted(metrics_count.items()):
        print(f"   {metric}: {count} points")
    
    if scenarios:
        print(f"\n🎭 Test Scenarios:")
        for scenario in sorted(scenarios):
            print(f"   {scenario}")

def get_file_size(file_path):
    """Get human-readable file size"""
    try:
        import os
        size = os.path.getsize(file_path)
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    except:
        return "Unknown"

def main():
    parser = argparse.ArgumentParser(description='Import K6 JSON results to InfluxDB for Grafana analysis')
    parser.add_argument('json_file', help='K6 JSON results file')
    parser.add_argument('--influxdb-url', default='http://127.0.0.1:8086', help='InfluxDB URL (default: http://127.0.0.1:8086)')
    parser.add_argument('--database', default='k6', help='InfluxDB database name (default: k6)')
    parser.add_argument('--batch-size', type=int, default=1000, help='Batch size for imports (default: 1000)')
    parser.add_argument('--analyze-only', action='store_true', help='Only analyze the JSON file, do not import')
    
    args = parser.parse_args()
    
    print("🚀 K6 JSON to InfluxDB Importer")
    print("=" * 40)
    
    if args.analyze_only:
        analyze_json_file(args.json_file)
    else:
        # First analyze
        analyze_json_file(args.json_file)
        
        # Then import
        print("\n" + "=" * 40)
        print("📥 Starting Import...")
        success = import_k6_json_to_influxdb(
            args.json_file, 
            args.influxdb_url, 
            args.database, 
            args.batch_size
        )
        
        if success:
            print(f"\n✅ Import completed! Data is now available in Grafana.")
            print(f"🎯 Next steps:")
            print(f"   1. Open Grafana: http://your-grafana-url:3000")
            print(f"   2. Add InfluxDB data source: {args.influxdb_url}")
            print(f"   3. Import dashboard: grafana-enhanced-dashboard.json")
            print(f"   4. Select database: {args.database}")
        else:
            print(f"\n❌ Import failed. Please check the errors above.")
            sys.exit(1)

if __name__ == "__main__":
    main()
