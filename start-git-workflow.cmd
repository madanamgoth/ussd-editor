@echo off
REM Windows startup script for USSD Editor with Git Integration
setlocal enabledelayedexpansion

echo ==========================================
echo    🚀 USSD Editor with Git Integration  
echo ==========================================
echo.
echo Starting Git-integrated workflow system...
echo.
echo 🔧 This will start:
echo    1. Git workflow API server (Port 3001)
echo    2. React development server (Port 5173)
echo.
echo 📁 Workflow data will be stored in: workflow-data/
echo 🔄 Changes will be committed to your local Git repository
echo 🌍 Server will be accessible on all network interfaces (0.0.0.0)
echo.
echo Platform: Windows
node --version 2>nul && echo Node version: && node --version
npm --version 2>nul && echo NPM version: && npm --version
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo 🚀 Starting servers...
npm run dev:full

pause
