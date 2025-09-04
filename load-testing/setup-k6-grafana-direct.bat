@echo off
:: K6 Direct to Grafana Setup (Windows PowerShell Version)
:: This script sets up multiple options for K6 → Grafana integration

set LOADTEST_DIR=C:\ussd-editor\ussd-editor\load-testing
set TEST_NAME=%1
if "%TEST_NAME%"=="" set TEST_NAME=ussd-load-test

:: Generate timestamp
for /f "delims=" %%i in ('powershell -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"') do set TIMESTAMP=%%i

echo 🚀 K6 Direct to Grafana Setup
echo =============================
echo Choose your preferred method:
echo.
echo 1) Prometheus + Grafana (Local)
echo 2) Grafana Cloud (Easiest)
echo 3) CSV + Grafana CSV Plugin
echo 4) JSON Analysis Only
echo.

set /p choice="Select option (1-4): "

if "%choice%"=="1" goto prometheus
if "%choice%"=="2" goto cloud
if "%choice%"=="3" goto csv
if "%choice%"=="4" goto json
goto invalid

:prometheus
echo 🎯 Setting up Prometheus + Grafana...

:: Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found or not running
    echo Please start Docker Desktop first
    pause
    exit /b 1
)

:: Create Prometheus config
echo global: > prometheus.yml
echo   scrape_interval: 15s >> prometheus.yml
echo   evaluation_interval: 15s >> prometheus.yml
echo. >> prometheus.yml
echo scrape_configs: >> prometheus.yml
echo   - job_name: 'prometheus' >> prometheus.yml
echo     static_configs: >> prometheus.yml
echo       - targets: ['localhost:9090'] >> prometheus.yml

:: Start Prometheus
echo 📦 Starting Prometheus...
docker run -d --name prometheus -p 9090:9090 -v "%cd%\prometheus.yml:/etc/prometheus/prometheus.yml" prom/prometheus 2>nul || echo Prometheus container already exists

:: Start Grafana
echo 📊 Starting Grafana...
docker run -d --name grafana -p 3000:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana 2>nul || echo Grafana container already exists

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

:: Run K6 test
echo 🔄 Running K6 test with Prometheus output...
docker run --rm -v "%LOADTEST_DIR%:/loadtest" grafana/k6 run --out experimental-prometheus-rw=http://host.docker.internal:9090/api/v1/write --tag testid=%TEST_NAME%-%TIMESTAMP% --tag environment=staging /loadtest/ussd-load-test-enhanced.js

echo.
echo ✅ Test completed!
echo 📊 Grafana: http://127.0.0.1:3000 (admin/admin)
echo 📈 Prometheus: http://127.0.0.1:9090
goto end

:cloud
echo ☁️ Setting up Grafana Cloud...
echo.
set /p PROMETHEUS_URL="Prometheus endpoint URL: "
set /p USERNAME="Username: "
powershell -Command "$password = Read-Host 'API Key' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))" > temp_password.txt
set /p API_KEY=<temp_password.txt
del temp_password.txt

echo 🔄 Running K6 test with Grafana Cloud...
docker run --rm -v "%LOADTEST_DIR%:/loadtest" -e K6_PROMETHEUS_RW_SERVER_URL=%PROMETHEUS_URL% -e K6_PROMETHEUS_RW_USERNAME=%USERNAME% -e K6_PROMETHEUS_RW_PASSWORD=%API_KEY% grafana/k6 run --out experimental-prometheus-rw --tag testid=%TEST_NAME%-%TIMESTAMP% /loadtest/ussd-load-test-enhanced.js

echo.
echo ✅ Test completed!
echo ☁️ View results in your Grafana Cloud dashboard
goto end

:csv
echo 📄 Setting up CSV + Grafana CSV Plugin...

:: Run K6 with JSON output
echo 🔄 Running K6 test with JSON output...
docker run --rm -v "%LOADTEST_DIR%:/loadtest" grafana/k6 run --out json=/loadtest/%TEST_NAME%-%TIMESTAMP%.json --tag testid=%TEST_NAME%-%TIMESTAMP% /loadtest/ussd-load-test-enhanced.js

:: Convert JSON to CSV
echo 📊 Converting JSON to CSV...
cd /d "%LOADTEST_DIR%"
python json-to-csv-converter.py %TEST_NAME%-%TIMESTAMP%.json --output-prefix %TEST_NAME%-%TIMESTAMP% --create-dashboard

echo.
echo ✅ Conversion completed!
echo 📁 CSV files created in: %LOADTEST_DIR%
echo 📊 Dashboard JSON: grafana-csv-dashboard.json
echo.
echo 🎯 Next steps:
echo 1. Install CSV plugin: grafana-cli plugins install marcusolsson-csv-datasource
echo 2. Restart Grafana
echo 3. Add CSV data sources
echo 4. Import dashboard
goto end

:json
echo 📊 JSON Analysis Only...

:: Run K6 with JSON output
echo 🔄 Running K6 test with JSON output...
docker run --rm -v "%LOADTEST_DIR%:/loadtest" grafana/k6 run --out json=/loadtest/%TEST_NAME%-%TIMESTAMP%.json --summary-export=/loadtest/%TEST_NAME%-summary-%TIMESTAMP%.json /loadtest/ussd-load-test-enhanced.js > %LOADTEST_DIR%\%TEST_NAME%-console-%TIMESTAMP%.log

:: Analyze results
echo 🔍 Analyzing results...
cd /d "%LOADTEST_DIR%"
python k6-json-importer.py %TEST_NAME%-%TIMESTAMP%.json --analyze-only

:: Create HTML report
echo 📄 Creating HTML report...
(
echo ^<!DOCTYPE html^>
echo ^<html^>
echo ^<head^>
echo     ^<title^>K6 Load Test Report^</title^>
echo     ^<style^>
echo         body { font-family: Arial, sans-serif; margin: 20px; }
echo         .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
echo         pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="header"^>
echo         ^<h1^>🚀 K6 Load Test Report^</h1^>
echo         ^<p^>^<strong^>Test:^</strong^> %TEST_NAME%^</p^>
echo         ^<p^>^<strong^>Timestamp:^</strong^> %TIMESTAMP%^</p^>
echo     ^</div^>
echo     ^<h2^>📁 Generated Files^</h2^>
echo     ^<ul^>
echo         ^<li^>JSON Results: %TEST_NAME%-%TIMESTAMP%.json^</li^>
echo         ^<li^>Summary: %TEST_NAME%-summary-%TIMESTAMP%.json^</li^>
echo         ^<li^>Console Log: %TEST_NAME%-console-%TIMESTAMP%.log^</li^>
echo     ^</ul^>
echo ^</body^>
echo ^</html^>
) > %TEST_NAME%-report-%TIMESTAMP%.html

echo.
echo ✅ Analysis completed!
echo 📄 HTML Report: %TEST_NAME%-report-%TIMESTAMP%.html
goto end

:invalid
echo ❌ Invalid option selected
exit /b 1

:end
echo.
echo 🎉 Setup completed successfully!
echo 📁 All files are in: %LOADTEST_DIR%
echo.
echo 💡 Recommendations:
echo    • Prometheus method: Best for real-time monitoring
echo    • Grafana Cloud: Easiest setup, no infrastructure needed
echo    • CSV method: Good for offline analysis
echo    • JSON method: Most flexible for custom analysis
echo.
echo 🚀 Happy load testing!
pause
