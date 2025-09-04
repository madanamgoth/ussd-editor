# K6 Direct to Grafana Setup (PowerShell Version)
# This script sets up multiple options for K6 → Grafana integration

param(
    [string]$TestName = "ussd-load-test",
    [string]$LoadTestDir = "C:\ussd-editor\ussd-editor\load-testing"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "🚀 K6 Direct to Grafana Setup" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""
Write-Host "Choose your preferred method:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) Prometheus + Grafana (Local)" -ForegroundColor White
Write-Host "2) Grafana Cloud (Easiest)" -ForegroundColor White  
Write-Host "3) CSV + Grafana CSV Plugin" -ForegroundColor White
Write-Host "4) JSON Analysis Only" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-4)"

switch ($choice) {
    "1" {
        Write-Host "🎯 Setting up Prometheus + Grafana..." -ForegroundColor Yellow
        
        # Check if Docker is running
        try {
            docker version | Out-Null
        }
        catch {
            Write-Host "❌ Docker not found or not running" -ForegroundColor Red
            Write-Host "Please start Docker Desktop first" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        # Create Prometheus config
        $prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
"@
        $prometheusConfig | Out-File -FilePath "prometheus.yml" -Encoding UTF8
        
        # Start Prometheus
        Write-Host "📦 Starting Prometheus..." -ForegroundColor Blue
        try {
            docker run -d --name prometheus -p 9090:9090 -v "${PWD}\prometheus.yml:/etc/prometheus/prometheus.yml" prom/prometheus 2>$null
        }
        catch {
            Write-Host "Prometheus container already exists" -ForegroundColor Yellow
        }
        
        # Start Grafana
        Write-Host "📊 Starting Grafana..." -ForegroundColor Blue
        try {
            docker run -d --name grafana -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana 2>$null
        }
        catch {
            Write-Host "Grafana container already exists" -ForegroundColor Yellow
        }
        
        Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Run K6 test
        Write-Host "🔄 Running K6 test with Prometheus output..." -ForegroundColor Blue
        docker run --rm -v "${LoadTestDir}:/loadtest" grafana/k6 run `
            --out experimental-prometheus-rw=http://host.docker.internal:9090/api/v1/write `
            --tag testid="$TestName-$timestamp" `
            --tag environment=staging `
            /loadtest/ussd-load-test-enhanced.js
        
        Write-Host ""
        Write-Host "✅ Test completed!" -ForegroundColor Green
        Write-Host "📊 Grafana: http://127.0.0.1:3000 (admin/admin)" -ForegroundColor Cyan
        Write-Host "📈 Prometheus: http://127.0.0.1:9090" -ForegroundColor Cyan
    }
    
    "2" {
        Write-Host "☁️ Setting up Grafana Cloud..." -ForegroundColor Yellow
        Write-Host ""
        $prometheusUrl = Read-Host "Prometheus endpoint URL"
        $username = Read-Host "Username"
        $apiKey = Read-Host "API Key" -AsSecureString
        $apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))
        
        Write-Host "🔄 Running K6 test with Grafana Cloud..." -ForegroundColor Blue
        docker run --rm -v "${LoadTestDir}:/loadtest" `
            -e K6_PROMETHEUS_RW_SERVER_URL="$prometheusUrl" `
            -e K6_PROMETHEUS_RW_USERNAME="$username" `
            -e K6_PROMETHEUS_RW_PASSWORD="$apiKeyPlain" `
            grafana/k6 run --out experimental-prometheus-rw `
            --tag testid="$TestName-$timestamp" `
            /loadtest/ussd-load-test-enhanced.js
        
        Write-Host ""
        Write-Host "✅ Test completed!" -ForegroundColor Green
        Write-Host "☁️ View results in your Grafana Cloud dashboard" -ForegroundColor Cyan
    }
    
    "3" {
        Write-Host "📄 Setting up CSV + Grafana CSV Plugin..." -ForegroundColor Yellow
        
        # Run K6 with JSON output
        Write-Host "🔄 Running K6 test with JSON output..." -ForegroundColor Blue
        docker run --rm -v "${LoadTestDir}:/loadtest" grafana/k6 run `
            --out json="/loadtest/$TestName-$timestamp.json" `
            --tag testid="$TestName-$timestamp" `
            /loadtest/ussd-load-test-enhanced.js
        
        # Convert JSON to CSV
        Write-Host "📊 Converting JSON to CSV..." -ForegroundColor Blue
        Set-Location $LoadTestDir
        python json-to-csv-converter.py "$TestName-$timestamp.json" `
            --output-prefix "$TestName-$timestamp" `
            --create-dashboard
        
        Write-Host ""
        Write-Host "✅ Conversion completed!" -ForegroundColor Green
        Write-Host "📁 CSV files created in: $LoadTestDir" -ForegroundColor Cyan
        Write-Host "📊 Dashboard JSON: grafana-csv-dashboard.json" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🎯 Next steps:" -ForegroundColor Yellow
        Write-Host "1. Install CSV plugin: grafana-cli plugins install marcusolsson-csv-datasource" -ForegroundColor White
        Write-Host "2. Restart Grafana" -ForegroundColor White
        Write-Host "3. Add CSV data sources" -ForegroundColor White
        Write-Host "4. Import dashboard" -ForegroundColor White
    }
    
    "4" {
        Write-Host "📊 JSON Analysis Only..." -ForegroundColor Yellow
        
        # Run K6 with JSON output
        Write-Host "🔄 Running K6 test with JSON output..." -ForegroundColor Blue
        docker run --rm -v "${LoadTestDir}:/loadtest" grafana/k6 run `
            --out json="/loadtest/$TestName-$timestamp.json" `
            --summary-export="/loadtest/$TestName-summary-$timestamp.json" `
            /loadtest/ussd-load-test-enhanced.js | Tee-Object -FilePath "$LoadTestDir\$TestName-console-$timestamp.log"
        
        # Analyze results
        Write-Host "🔍 Analyzing results..." -ForegroundColor Blue
        Set-Location $LoadTestDir
        python k6-json-importer.py "$TestName-$timestamp.json" --analyze-only
        
        # Create HTML report
        Write-Host "📄 Creating HTML report..." -ForegroundColor Blue
        $htmlReport = @"
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
        <p><strong>Test:</strong> $TestName</p>
        <p><strong>Timestamp:</strong> $timestamp</p>
    </div>
    
    <h2>📁 Generated Files</h2>
    <ul>
        <li>JSON Results: $TestName-$timestamp.json</li>
        <li>Summary: $TestName-summary-$timestamp.json</li>
        <li>Console Log: $TestName-console-$timestamp.log</li>
    </ul>
    
    <h2>🔄 Convert to Other Formats</h2>
    <pre>
# Convert to CSV for Grafana
python json-to-csv-converter.py $TestName-$timestamp.json

# Import to InfluxDB (if needed later)
python k6-json-importer.py $TestName-$timestamp.json

# Custom analysis
Get-Content $TestName-$timestamp.json | ConvertFrom-Json | Where-Object { `$_.data.type -eq "Point" }
    </pre>
</body>
</html>
"@
        $htmlReport | Out-File -FilePath "$TestName-report-$timestamp.html" -Encoding UTF8
        
        Write-Host ""
        Write-Host "✅ Analysis completed!" -ForegroundColor Green
        Write-Host "📄 HTML Report: $TestName-report-$timestamp.html" -ForegroundColor Cyan
        Write-Host "📊 JSON Results: $TestName-$timestamp.json" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Invalid option selected" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "📁 All files are in: $LoadTestDir" -ForegroundColor Cyan

# Final recommendations
Write-Host ""
Write-Host "💡 Recommendations:" -ForegroundColor Yellow
Write-Host "   • Prometheus method: Best for real-time monitoring" -ForegroundColor White
Write-Host "   • Grafana Cloud: Easiest setup, no infrastructure needed" -ForegroundColor White
Write-Host "   • CSV method: Good for offline analysis" -ForegroundColor White
Write-Host "   • JSON method: Most flexible for custom analysis" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Happy load testing!" -ForegroundColor Green

Read-Host "Press Enter to exit"
