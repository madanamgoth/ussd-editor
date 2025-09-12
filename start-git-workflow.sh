#!/bin/bash
# Cross-platform startup script for USSD Editor with Git Integration
# Works on Linux, macOS, and Windows (via Git Bash/WSL)

echo "=========================================="
echo "   🚀 USSD Editor with Git Integration   "
echo "=========================================="
echo ""
echo "Starting Git-integrated workflow system..."
echo ""
echo "🔧 This will start:"
echo "   1. Git workflow API server (Port 3001)"
echo "   2. React development server (Port 5173)"
echo ""
echo "📁 Workflow data will be stored in: workflow-data/"
echo "🔄 Changes will be committed to your local Git repository"
echo "🌍 Server will be accessible on all network interfaces (0.0.0.0)"
echo ""
echo "Platform: $(uname -s)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting servers..."
npm run dev:full
