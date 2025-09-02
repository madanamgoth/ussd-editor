@echo off
REM USSD Load Testing Setup Script for Windows

echo 🚀 Setting up USSD Load Testing Environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not installed. Please install Node.js first.
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
npm install

REM Install global tools
echo 🔧 Installing global load testing tools...

REM Install Artillery
artillery --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Artillery...
    npm install -g artillery
) else (
    echo ✅ Artillery already installed:
    artillery --version
)

REM Check for JMeter
jmeter --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ JMeter found
) else (
    echo ⚠️  JMeter not found. Please install JMeter manually if you want to use JMeter tests.
    echo    Download from: https://jmeter.apache.org/download_jmeter.cgi
)

echo.
echo 🎯 Load Testing Tools Setup Complete!
echo.
echo Available Commands:
echo   npm run test           - Run custom Node.js load test
echo   npm run test:artillery - Run Artillery load test
echo   npm run test:k6        - Run K6 load test (if installed)
echo.
echo Before running tests:
echo 1. Update BASE_URL in test files to point to your USSD gateway
echo 2. Export your USSD flow and run: node flow-test-generator.js your-flow.json
echo 3. Configure test parameters (users, duration, etc.)
echo.
echo Happy testing! 🎉

pause
