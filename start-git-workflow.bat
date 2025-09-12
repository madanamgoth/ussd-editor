@echo off
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
echo.
echo Press Ctrl+C to stop both servers
echo.
pause

echo Starting servers...
npm run dev:full
