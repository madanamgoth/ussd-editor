#!/bin/bash
# Production deployment script for USSD Editor with Git Integration
# Cross-platform deployment script

echo "=========================================="
echo "   🏭 USSD Editor Production Deployment   "
echo "=========================================="
echo ""

# Set production environment
export NODE_ENV=production
export PORT=${PORT:-3001}
export FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3001"}

echo "🔧 Environment: $NODE_ENV"
echo "🌐 Port: $PORT"
echo "🔗 Frontend URL: $FRONTEND_URL"
echo "🖥️  Platform: $(uname -s)"
echo ""

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Build React app
echo "🔨 Building React application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Start production server
echo "🚀 Starting production server..."
echo "🌍 Server will be accessible at: http://0.0.0.0:$PORT"
echo "📁 Workflow data: workflow-data/"
echo "🔄 Git integration: Active"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run start
