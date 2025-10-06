#!/bin/bash

# USSD K6 Test Runner Script
# This script helps run the corrected K6 USSD tests with proper configuration

echo "🚀 USSD K6 Test Runner Starting..."
echo "=================================="

# Configuration
SCRIPT_FILE="corrected-k6-ussd-test.js"
LOG_FILE="k6-test-results-$(date +%Y%m%d_%H%M%S).log"

# Check if K6 script exists
if [ ! -f "$SCRIPT_FILE" ]; then
    echo "❌ Error: $SCRIPT_FILE not found!"
    echo "Please make sure the corrected K6 script is in the current directory."
    exit 1
fi

echo "📋 Test Configuration:"
echo "  Script: $SCRIPT_FILE"
echo "  Log File: $LOG_FILE"
echo "  Target: http://10.22.21.207:9401/MenuManagement/RequestReceiver"
echo "  Scenarios: 6 corrected flows"
echo ""

# Function to run K6 test
run_k6_test() {
    local test_type=$1
    local additional_params=$2
    
    echo "🏃 Running $test_type test..."
    echo "Command: k6 run $additional_params $SCRIPT_FILE"
    echo ""
    
    # Run K6 test and capture output
    k6 run $additional_params "$SCRIPT_FILE" 2>&1 | tee -a "$LOG_FILE"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $test_type test completed successfully!"
    else
        echo "❌ $test_type test failed with exit code: $exit_code"
    fi
    
    echo ""
    return $exit_code
}

# Menu for test types
echo "Select test type:"
echo "1) Quick Test (1 VU, 30s)"
echo "2) Development Test (5 VUs, 2 min)"
echo "3) Load Test (Default stages)"
echo "4) Custom Test (Enter your own parameters)"
echo "5) Docker Test (Run with Docker)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🧪 Running Quick Test..."
        run_k6_test "Quick" "--vus 1 --duration 30s"
        ;;
    2)
        echo "🧪 Running Development Test..."
        run_k6_test "Development" "--vus 5 --duration 2m"
        ;;
    3)
        echo "🧪 Running Load Test with default stages..."
        run_k6_test "Load" ""
        ;;
    4)
        echo "🧪 Custom Test Configuration"
        read -p "Enter K6 parameters (e.g., --vus 10 --duration 1m): " custom_params
        run_k6_test "Custom" "$custom_params"
        ;;
    5)
        echo "🐳 Running with Docker..."
        if command -v docker &> /dev/null; then
            echo "Command: docker run --rm --network=host -v \$(pwd):/loadTest grafana/k6 run /loadTest/$SCRIPT_FILE"
            docker run --rm --network="host" -v $(pwd):/loadTest grafana/k6 run /loadTest/$SCRIPT_FILE 2>&1 | tee -a "$LOG_FILE"
        else
            echo "❌ Docker not found! Please install Docker or use local K6."
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Test completion summary
echo ""
echo "📊 Test Execution Summary:"
echo "=================================="
echo "  Timestamp: $(date)"
echo "  Script Used: $SCRIPT_FILE"
echo "  Log File: $LOG_FILE"
echo "  Test Type: Choice $choice"
echo ""

# Show recent errors from log if any
if [ -f "$LOG_FILE" ]; then
    echo "📋 Recent Test Output (last 20 lines):"
    echo "======================================"
    tail -20 "$LOG_FILE"
    echo ""
    
    # Check for specific issues
    echo "🔍 Quick Issue Analysis:"
    echo "========================"
    
    if grep -q "FAILED" "$LOG_FILE"; then
        echo "❌ Found validation failures in test results"
        echo "   Failed validations:"
        grep "FAILED" "$LOG_FILE" | tail -5
    fi
    
    if grep -q "error" "$LOG_FILE"; then
        echo "❌ Found errors in test execution"
        echo "   Recent errors:"
        grep -i "error" "$LOG_FILE" | tail -3
    fi
    
    if grep -q "✅" "$LOG_FILE"; then
        echo "✅ Found successful validations"
        success_count=$(grep -c "✅" "$LOG_FILE")
        echo "   Total successful steps: $success_count"
    fi
    
    # Show threshold results
    if grep -q "THRESHOLDS" "$LOG_FILE"; then
        echo ""
        echo "📈 Threshold Results:"
        echo "===================="
        grep -A 20 "THRESHOLDS" "$LOG_FILE" | grep -E "(✓|✗)"
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Review the log file: $LOG_FILE"
echo "2. Check validation failures and fix assertions if needed"
echo "3. Verify USSD service responses match expected patterns"
echo "4. Adjust dynamic input generation if values are incorrect"
echo ""
echo "🚀 Test runner completed!"