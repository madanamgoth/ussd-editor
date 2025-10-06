# USSD K6 Test Runner Script for Windows PowerShell
# This script helps run the corrected K6 USSD tests with proper configuration

Write-Host "🚀 USSD K6 Test Runner Starting..." -ForegroundColor Green
Write-Host "=================================="

# Configuration
$SCRIPT_FILE = "corrected-k6-ussd-test.js"
$LOG_FILE = "k6-test-results-$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Check if K6 script exists
if (-not (Test-Path $SCRIPT_FILE)) {
    Write-Host "❌ Error: $SCRIPT_FILE not found!" -ForegroundColor Red
    Write-Host "Please make sure the corrected K6 script is in the current directory."
    exit 1
}

Write-Host "📋 Test Configuration:"
Write-Host "  Script: $SCRIPT_FILE"
Write-Host "  Log File: $LOG_FILE"
Write-Host "  Target: http://10.22.21.207:9401/MenuManagement/RequestReceiver"
Write-Host "  Scenarios: 6 corrected flows"
Write-Host ""

# Function to run K6 test
function Run-K6Test {
    param(
        [string]$TestType,
        [string]$AdditionalParams
    )
    
    Write-Host "🏃 Running $TestType test..." -ForegroundColor Yellow
    Write-Host "Command: k6 run $AdditionalParams $SCRIPT_FILE"
    Write-Host ""
    
    # Run K6 test and capture output
    try {
        if ($AdditionalParams) {
            $command = "k6 run $AdditionalParams `"$SCRIPT_FILE`""
        } else {
            $command = "k6 run `"$SCRIPT_FILE`""
        }
        
        Write-Host "Executing: $command" -ForegroundColor Cyan
        Invoke-Expression $command | Tee-Object -FilePath $LOG_FILE -Append
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $TestType test completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ $TestType test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error running K6 test: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    return ($LASTEXITCODE -eq 0)
}

# Menu for test types
Write-Host "Select test type:"
Write-Host "1) Quick Test (1 VU, 30s)"
Write-Host "2) Development Test (5 VUs, 2 min)"
Write-Host "3) Load Test (Default stages)"
Write-Host "4) Custom Test (Enter your own parameters)"
Write-Host "5) Docker Test (Run with Docker)"
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    1 {
        Write-Host "🧪 Running Quick Test..." -ForegroundColor Cyan
        Run-K6Test "Quick" "--vus 1 --duration 30s"
    }
    2 {
        Write-Host "🧪 Running Development Test..." -ForegroundColor Cyan
        Run-K6Test "Development" "--vus 5 --duration 2m"
    }
    3 {
        Write-Host "🧪 Running Load Test with default stages..." -ForegroundColor Cyan
        Run-K6Test "Load" ""
    }
    4 {
        Write-Host "🧪 Custom Test Configuration" -ForegroundColor Cyan
        $customParams = Read-Host "Enter K6 parameters (e.g., --vus 10 --duration 1m)"
        Run-K6Test "Custom" $customParams
    }
    5 {
        Write-Host "🐳 Running with Docker..." -ForegroundColor Cyan
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            $dockerCmd = "docker run --rm --network=host -v `"${PWD}:/loadTest`" grafana/k6 run /loadTest/$SCRIPT_FILE"
            Write-Host "Command: $dockerCmd"
            try {
                Invoke-Expression $dockerCmd | Tee-Object -FilePath $LOG_FILE -Append
            }
            catch {
                Write-Host "❌ Docker execution failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Docker not found! Please install Docker or use local K6." -ForegroundColor Red
            exit 1
        }
    }
    default {
        Write-Host "❌ Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Test completion summary
Write-Host ""
Write-Host "📊 Test Execution Summary:" -ForegroundColor Green
Write-Host "=================================="
Write-Host "  Timestamp: $(Get-Date)"
Write-Host "  Script Used: $SCRIPT_FILE"
Write-Host "  Log File: $LOG_FILE"
Write-Host "  Test Type: Choice $choice"
Write-Host ""

# Show recent errors from log if any
if (Test-Path $LOG_FILE) {
    Write-Host "📋 Recent Test Output (last 20 lines):" -ForegroundColor Yellow
    Write-Host "======================================"
    Get-Content $LOG_FILE -Tail 20
    Write-Host ""
    
    # Check for specific issues
    Write-Host "🔍 Quick Issue Analysis:" -ForegroundColor Yellow
    Write-Host "========================"
    
    $logContent = Get-Content $LOG_FILE -Raw
    
    if ($logContent -match "FAILED") {
        Write-Host "❌ Found validation failures in test results" -ForegroundColor Red
        Write-Host "   Failed validations:"
        Select-String -Path $LOG_FILE -Pattern "FAILED" | Select-Object -Last 5 | ForEach-Object { Write-Host "   $($_.Line)" }
    }
    
    if ($logContent -match "error") {
        Write-Host "❌ Found errors in test execution" -ForegroundColor Red
        Write-Host "   Recent errors:"
        Select-String -Path $LOG_FILE -Pattern "error" -AllMatches | Select-Object -Last 3 | ForEach-Object { Write-Host "   $($_.Line)" }
    }
    
    if ($logContent -match "✅") {
        Write-Host "✅ Found successful validations" -ForegroundColor Green
        $successCount = (Select-String -Path $LOG_FILE -Pattern "✅" -AllMatches).Count
        Write-Host "   Total successful steps: $successCount"
    }
    
    # Show threshold results
    if ($logContent -match "THRESHOLDS") {
        Write-Host ""
        Write-Host "📈 Threshold Results:" -ForegroundColor Yellow
        Write-Host "===================="
        $thresholdSection = Select-String -Path $LOG_FILE -Pattern "THRESHOLDS" -Context 0,20
        if ($thresholdSection) {
            $thresholdSection.Context.PostContext | Where-Object { $_ -match "[✓✗]" } | ForEach-Object { Write-Host $_ }
        }
    }
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "=============="
Write-Host "1. Review the log file: $LOG_FILE"
Write-Host "2. Check validation failures and fix assertions if needed"
Write-Host "3. Verify USSD service responses match expected patterns"
Write-Host "4. Adjust dynamic input generation if values are incorrect"
Write-Host ""
Write-Host "🚀 Test runner completed!" -ForegroundColor Green