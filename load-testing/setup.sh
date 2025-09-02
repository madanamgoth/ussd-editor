#!/bin/bash

# USSD Load Testing Setup Script
echo "🚀 Setting up USSD Load Testing Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install global tools
echo "🔧 Installing global load testing tools..."

# Install Artillery
if ! command -v artillery &> /dev/null; then
    echo "Installing Artillery..."
    npm install -g artillery
else
    echo "✅ Artillery already installed: $(artillery --version)"
fi

# Install K6 (if on macOS/Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v k6 &> /dev/null; then
        echo "Installing K6..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install k6
        else
            # Linux
            sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        fi
    else
        echo "✅ K6 already installed: $(k6 version)"
    fi
fi

# Check for JMeter
if command -v jmeter &> /dev/null; then
    echo "✅ JMeter found: $(jmeter --version 2>&1 | head -1)"
else
    echo "⚠️  JMeter not found. Please install JMeter manually if you want to use JMeter tests."
    echo "   Download from: https://jmeter.apache.org/download_jmeter.cgi"
fi

echo ""
echo "🎯 Load Testing Tools Setup Complete!"
echo ""
echo "Available Commands:"
echo "  npm run test           - Run custom Node.js load test"
echo "  npm run test:artillery - Run Artillery load test"
echo "  npm run test:k6        - Run K6 load test"
echo ""
echo "Before running tests:"
echo "1. Update BASE_URL in test files to point to your USSD gateway"
echo "2. Export your USSD flow and run: node flow-test-generator.js your-flow.json"
echo "3. Configure test parameters (users, duration, etc.)"
echo ""
echo "Happy testing! 🎉"
