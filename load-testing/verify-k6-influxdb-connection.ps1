# 🔧 K6 InfluxDB Connection Verification Script (PowerShell)
# Run this script to verify your K6 → InfluxDB → Grafana setup

Write-Host "🚀 K6 → InfluxDB → Grafana Connection Test" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

function Test-Service {
    param([string]$url, [string]$name)
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ $name is running and accessible" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $name is not accessible at $url" -ForegroundColor Red
        return $false
    }
}

# Test InfluxDB connection
Write-Host "`n📊 Step 1: Testing InfluxDB Connection..." -ForegroundColor Blue
if (-not (Test-Service -url "http://localhost:8086/ping" -name "InfluxDB")) {
    Write-Host "💡 Start InfluxDB service and try again" -ForegroundColor Yellow
    exit 1
}

# Check if K6 database exists
Write-Host "`n🗄️ Step 2: Checking K6 Database..." -ForegroundColor Blue
try {
    $dbCheck = Invoke-RestMethod -Uri "http://localhost:8086/query" -Method Get -Body @{q="SHOW DATABASES"}
    if ($dbCheck.results[0].series[0].values -contains @("k6")) {
        Write-Host "✅ K6 database exists in InfluxDB" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Creating K6 database..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "http://localhost:8086/query" -Method Post -Body @{q="CREATE DATABASE k6"} | Out-Null
        Write-Host "✅ K6 database created successfully" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Failed to access InfluxDB database operations" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Grafana connection
Write-Host "`n📊 Step 3: Testing Grafana Connection..." -ForegroundColor Blue
Test-Service -url "http://localhost:3000/api/health" -name "Grafana" | Out-Null

# Test K6 installation
Write-Host "`n🔧 Step 4: Testing K6 Installation..." -ForegroundColor Blue
try {
    $k6Version = k6 version 2>&1
    if ($k6Version -match "k6 v") {
        Write-Host "✅ K6 is installed: $($k6Version.Split("`n")[0])" -ForegroundColor Green
        
        # Create minimal K6 test
        $testScript = @"
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
"@
        
        $testFile = "$env:TEMP\k6-influxdb-test.js"
        $testScript | Out-File -FilePath $testFile -Encoding UTF8
        
        Write-Host "🔄 Running 10-second K6 test with InfluxDB output..." -ForegroundColor Yellow
        
        # Run K6 test with InfluxDB output
        $k6Result = & k6 run --out influxdb=http://localhost:8086/k6 --tag test=connection_verify $testFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ K6 test completed successfully with InfluxDB output" -ForegroundColor Green
            
            # Wait for data to be written
            Start-Sleep -Seconds 3
            
            # Verify data in InfluxDB
            Write-Host "`n🔍 Step 5: Verifying Data in InfluxDB..." -ForegroundColor Blue
            try {
                $measurements = Invoke-RestMethod -Uri "http://localhost:8086/query" -Method Get -Body @{db="k6"; q="SHOW MEASUREMENTS"}
                if ($measurements.results[0].series) {
                    $count = $measurements.results[0].series[0].values.Count
                    Write-Host "✅ Data successfully written to InfluxDB" -ForegroundColor Green
                    Write-Host "📊 Found $count measurement types" -ForegroundColor Green
                    
                    Write-Host "`n📋 Sample Measurements in K6 Database:" -ForegroundColor Blue
                    $measurements.results[0].series[0].values[0..9] | ForEach-Object {
                        Write-Host "  • $_" -ForegroundColor White
                    }
                    
                    # Check HTTP requests
                    try {
                        $httpReqs = Invoke-RestMethod -Uri "http://localhost:8086/query" -Method Get -Body @{db="k6"; q="SELECT COUNT(*) FROM http_reqs WHERE test='connection_verify'"}
                        if ($httpReqs.results[0].series) {
                            $reqCount = $httpReqs.results[0].series[0].values[0][1]
                            Write-Host "📈 HTTP requests recorded: $reqCount" -ForegroundColor Green
                        }
                    }
                    catch {
                        Write-Host "⚠️  Could not retrieve HTTP request count" -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "❌ No data found in InfluxDB" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ Could not verify InfluxDB data: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ K6 test failed" -ForegroundColor Red
            Write-Host "Output: $k6Result" -ForegroundColor Yellow
        }
        
        # Clean up
        Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
        
    } else {
        Write-Host "❌ K6 is not installed or not in PATH" -ForegroundColor Red
        Write-Host "💡 Install K6: winget install k6" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ K6 is not installed or not accessible" -ForegroundColor Red
    Write-Host "💡 Install K6 from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
}

# Summary
Write-Host "`n🎯 Summary & Next Steps:" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue
Write-Host "1. InfluxDB: http://localhost:8086 (Database: k6)" -ForegroundColor Green
Write-Host "2. Grafana: http://localhost:3000" -ForegroundColor Green
Write-Host "3. Import K6 Dashboard: Dashboard ID 2587" -ForegroundColor Green
Write-Host "4. K6 Command: k6 run --out influxdb=http://localhost:8086/k6 your-script.js" -ForegroundColor Green

Write-Host "`n✅ Your K6 → InfluxDB → Grafana pipeline verification complete!" -ForegroundColor Green
Write-Host "🚀 Run your USSD load test with InfluxDB output now!" -ForegroundColor Cyan

# Grafana dashboard import instructions
Write-Host "`n📊 Grafana Dashboard Setup:" -ForegroundColor Blue
Write-Host "1. Open Grafana: http://localhost:3000" -ForegroundColor White
Write-Host "2. Go to Dashboards → Import" -ForegroundColor White
Write-Host "3. Enter Dashboard ID: 2587" -ForegroundColor White
Write-Host "4. Select InfluxDB data source (k6 database)" -ForegroundColor White
Write-Host "5. Click Import" -ForegroundColor White
