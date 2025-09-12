# 🚀 USSD Editor - Cross-Platform Deployment Guide

A maker-checker workflow system for USSD flows with Git integration. Deploy anywhere: Windows, Linux, macOS, Docker, or cloud platforms.

## 🌍 Platform Support

- ✅ **Windows** (Native, WSL, Docker)
- ✅ **Linux** (Ubuntu, CentOS, Debian, Alpine)
- ✅ **macOS** (Intel, Apple Silicon)
- ✅ **Docker** (Any platform)
- ✅ **Cloud** (AWS, Azure, GCP, Digital Ocean, etc.)

## 🔧 Prerequisites

- **Node.js** 18+ 
- **Git** (for version control integration)
- **npm** (comes with Node.js)

## 🚀 Quick Start

### Development Mode

#### Windows
```batch
# Clone repository
git clone <your-repo-url>
cd ussd-editor

# Start development servers
start-git-workflow.cmd
```

#### Linux/macOS
```bash
# Clone repository
git clone <your-repo-url>
cd ussd-editor

# Make script executable
chmod +x start-git-workflow.sh

# Start development servers
./start-git-workflow.sh
```

#### Cross-platform (npm)
```bash
# Install dependencies
npm install

# Start both servers
npm run dev:full
```

## 🏭 Production Deployment

### Option 1: Native Deployment

#### Linux/macOS
```bash
# Make script executable
chmod +x deploy-production.sh

# Deploy
./deploy-production.sh
```

#### Windows
```batch
# Set environment variables
set NODE_ENV=production
set PORT=3001

# Install and build
npm ci --only=production
npm run build

# Start production server
npm run start
```

### Option 2: Docker Deployment

#### Single Container
```bash
# Build image
docker build -t ussd-editor .

# Run container
docker run -p 3001:3001 \
  -v $(pwd)/workflow-data:/app/workflow-data \
  -v $(pwd)/.git:/app/.git \
  ussd-editor
```

#### Docker Compose (Recommended)
```bash
# Start services
docker-compose up -d

# With nginx reverse proxy
docker-compose --profile production up -d
```

### Option 3: Cloud Deployment

#### Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-ussd-editor

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### AWS/GCP/Azure
Use the Docker image or deploy directly with your cloud provider's Node.js service.

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Server port |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS |

### Git Integration

The system automatically:
- Creates `workflow-data/` directory
- Stores approved/pending graphs as JSON files
- Commits changes to your local Git repository
- Supports pull/push operations

### File Structure
```
workflow-data/
├── approved-graphs.json    # Approved USSD flows
├── pending-graphs.json     # Pending review flows  
└── rejected-graphs.json    # Rejected flows
```

## 🌐 Access Points

### Development
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### Production
- **Application**: http://localhost:3001 (or your configured port)
- **API**: http://localhost:3001/api/*
- **Health Check**: http://localhost:3001/api/health

## 🔄 Workflow Features

### Maker-Checker Process
1. **Maker** creates/edits USSD flows
2. **Maker** submits for review (stored in Git)
3. **Checker** reviews changes with side-by-side comparison
4. **Checker** approves/rejects (committed to Git)
5. **System** tracks full audit trail

### Git Integration Benefits
- ✅ Cross-browser data sharing
- ✅ Team collaboration
- ✅ Version history
- ✅ Backup and recovery
- ✅ Deployment portability

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3001   # Windows
lsof -i :3001                  # Linux/macOS

# Kill process or change port
set PORT=3002                  # Windows
export PORT=3002               # Linux/macOS
```

#### Git Permission Issues
```bash
# Set Git user (required for commits)
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

#### Node.js Version Issues
```bash
# Check version
node --version

# Update Node.js
# Visit: https://nodejs.org/
```

## 📊 Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-11T...",
  "gitIntegration": "active",
  "environment": "production",
  "platform": "linux",
  "gitStatus": "clean"
}
```

## 🔐 Security Considerations

- Run behind reverse proxy in production
- Enable HTTPS with SSL certificates
- Configure firewall rules appropriately
- Regular Git repository backups
- Monitor workflow-data directory permissions

## 📝 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/approved-graphs` | Get approved flows |
| GET | `/api/pending-graphs` | Get pending flows |
| POST | `/api/pending-graphs` | Submit new flow |
| POST | `/api/approve-graph/:id` | Approve flow |
| POST | `/api/reject-graph/:id` | Reject flow |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test on your target platform
5. Submit pull request

## 📄 License

[Your License Here]

---

**Deploy anywhere, run everywhere! 🌍**
