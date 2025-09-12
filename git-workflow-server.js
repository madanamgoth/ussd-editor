// Cross-Platform Express API Server for Local Git Integration
// Provides REST endpoints for the React frontend to interact with local Git storage
// Compatible with Windows, Linux, and macOS deployment

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { simpleGitStorage } from './src/utils/simpleGitStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Initialize Git storage on server start
async function initializeServer() {
  console.log('🚀 Initializing simple Git workflow server...');
  const initialized = await simpleGitStorage.initialize();
  
  if (initialized) {
    console.log('✅ Storage initialized successfully');
    
    // Run Git performance test
    await simpleGitStorage.testGitPerformance();
  } else {
    console.log('⚠️  Storage initialization failed - using fallback mode');
  }
}

// API Routes

// GET approved graphs
app.get('/api/approved-graphs', async (req, res) => {
  try {
    const graphs = await simpleGitStorage.getApprovedGraphs();
    res.json(graphs);
  } catch (error) {
    console.error('Error fetching approved graphs:', error);
    res.status(500).json({ error: 'Failed to fetch approved graphs' });
  }
});

// GET pending graphs
app.get('/api/pending-graphs', async (req, res) => {
  try {
    const graphs = await simpleGitStorage.getPendingGraphs();
    res.json(graphs);
  } catch (error) {
    console.error('Error fetching pending graphs:', error);
    res.status(500).json({ error: 'Failed to fetch pending graphs' });
  }
});

// POST new pending graph
app.post('/api/pending-graphs', async (req, res) => {
  try {
    const graphData = req.body;
    
    // Add metadata
    graphData.id = Date.now().toString();
    graphData.metadata = {
      ...graphData.metadata,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      submittedBy: 'current-user' // TODO: Add proper user context
    };
    
    await simpleGitStorage.addPendingGraph(graphData);
    
    res.json({ 
      success: true, 
      message: 'Graph submitted for review',
      graphId: graphData.id 
    });
  } catch (error) {
    console.error('Error adding pending graph:', error);
    res.status(500).json({ error: 'Failed to submit graph for review' });
  }
});

// POST approve graph
app.post('/api/approve-graph/:graphId', async (req, res) => {
  try {
    const { graphId } = req.params;
    const success = await simpleGitStorage.approveGraph(graphId);
    
    if (success) {
      res.json({ success: true, message: 'Graph approved successfully' });
    } else {
      res.status(404).json({ error: 'Graph not found in pending list' });
    }
  } catch (error) {
    console.error('Error approving graph:', error);
    res.status(500).json({ error: 'Failed to approve graph' });
  }
});

// POST reject graph
app.post('/api/reject-graph/:graphId', async (req, res) => {
  try {
    const { graphId } = req.params;
    const { reason } = req.body;
    
    const success = await simpleGitStorage.rejectGraph(graphId, reason || 'No reason provided');
    
    if (success) {
      res.json({ success: true, message: 'Graph rejected successfully' });
    } else {
      res.status(404).json({ error: 'Graph not found in pending list' });
    }
  } catch (error) {
    console.error('Error rejecting graph:', error);
    res.status(500).json({ error: 'Failed to reject graph' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      gitIntegration: simpleGitStorage.gitAvailable ? 'active' : 'disabled',
      environment: NODE_ENV,
      platform: process.platform
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Serve React app in production
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
initializeServer().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Git workflow API server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Workflow data will be stored in: workflow-data/`);
    console.log(`🔧 Environment: ${NODE_ENV}`);
    console.log(`🖥️  Platform: ${process.platform}`);
    console.log(`🔧 Endpoints available:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/approved-graphs`);
    console.log(`   GET  /api/pending-graphs`);
    console.log(`   POST /api/pending-graphs`);
    console.log(`   POST /api/approve-graph/:id`);
    console.log(`   POST /api/reject-graph/:id`);
    
    if (NODE_ENV === 'production') {
      console.log(`🚀 Production mode: Serving React app at http://0.0.0.0:${PORT}`);
    }
  });
});

export default app;
