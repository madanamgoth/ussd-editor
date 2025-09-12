// Simple Git Integration for Maker-Checker Workflow
// Checks if Git is installed and uses direct Git commands

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Simple file paths
const DATA_DIR = 'workflow-data';
const APPROVED_FILE = 'approved-graphs.json';
const PENDING_FILE = 'pending-graphs.json';

class SimpleGitStorage {
  constructor() {
    this.dataDir = DATA_DIR;
    this.approvedPath = path.join(DATA_DIR, APPROVED_FILE);
    this.pendingPath = path.join(DATA_DIR, PENDING_FILE);
    this.gitAvailable = false;
  }

  // Check if Git is installed
  async checkGitInstalled() {
    try {
      await execAsync('git --version');
      console.log('✅ Git is installed');
      this.gitAvailable = true;
      return true;
    } catch (error) {
      console.log('❌ Git not installed');
      console.log('💡 Please install Git to enable version control features');
      console.log('📥 Download from: https://git-scm.com/downloads');
      this.gitAvailable = false;
      return false;
    }
  }

  // Initialize storage
  async initialize() {
    console.log('🔍 Checking Git installation...');
    await this.checkGitInstalled();
    
    try {
      // Create data directory
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Create files if they don't exist
      await this.ensureFileExists(this.approvedPath, []);
      await this.ensureFileExists(this.pendingPath, []);
      
      if (this.gitAvailable) {
        // Add to Git and commit
        await this.gitCommit('Initialize workflow data');
        console.log('✅ Git integration active');
      } else {
        console.log('📁 Using file-based storage (no Git)');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing storage:', error);
      return false;
    }
  }

  async ensureFileExists(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  // Simple Git operations
  async gitCommit(message) {
    if (!this.gitAvailable) return;
    
    try {
      await execAsync(`git add ${this.dataDir}`);
      await execAsync(`git commit -m "${message}"`);
      console.log(`📝 Git commit: ${message}`);
    } catch (error) {
      console.log('ℹ️  Git commit info:', error.message);
    }
  }

  // Read operations
  async getApprovedGraphs() {
    try {
      const data = await fs.readFile(this.approvedPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async getPendingGraphs() {
    try {
      const data = await fs.readFile(this.pendingPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  // Write operations
  async setApprovedGraphs(graphs) {
    await fs.writeFile(this.approvedPath, JSON.stringify(graphs, null, 2));
    await this.gitCommit('Update approved graphs');
  }

  async setPendingGraphs(graphs) {
    await fs.writeFile(this.pendingPath, JSON.stringify(graphs, null, 2));
    await this.gitCommit('Update pending graphs');
  }

  // Workflow operations
  async addPendingGraph(graphData) {
    const pending = await this.getPendingGraphs();
    pending.push(graphData);
    await this.setPendingGraphs(pending);
    console.log(`📤 Added graph "${graphData.metadata.name}" to pending`);
  }

  async approveGraph(graphId) {
    const pending = await this.getPendingGraphs();
    const approved = await this.getApprovedGraphs();
    
    const graphIndex = pending.findIndex(g => g.id === graphId);
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = 'APPROVED';
      graph.metadata.approvedAt = new Date().toISOString();
      
      approved.push(graph);
      pending.splice(graphIndex, 1);
      
      await this.setApprovedGraphs(approved);
      await this.setPendingGraphs(pending);
      
      console.log(`✅ Approved graph "${graph.metadata.name}"`);
      return true;
    }
    return false;
  }

  async rejectGraph(graphId, reason) {
    const pending = await this.getPendingGraphs();
    
    const graphIndex = pending.findIndex(g => g.id === graphId);
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = 'REJECTED';
      graph.metadata.rejectedAt = new Date().toISOString();
      graph.metadata.rejectionReason = reason;
      
      pending.splice(graphIndex, 1);
      await this.setPendingGraphs(pending);
      
      console.log(`❌ Rejected graph "${graph.metadata.name}"`);
      return true;
    }
    return false;
  }
}

// Export singleton
export const simpleGitStorage = new SimpleGitStorage();

// Browser wrapper (simplified)
export const gitStorageWrapper = {
  async getApprovedGraphs() {
    try {
      const response = await fetch('/api/approved-graphs');
      return await response.json();
    } catch (error) {
      // Fallback to localStorage
      const approved = localStorage.getItem('ussd-approved-graphs');
      return approved ? JSON.parse(approved) : [];
    }
  },

  async getPendingGraphs() {
    try {
      const response = await fetch('/api/pending-graphs');
      return await response.json();
    } catch (error) {
      const pending = localStorage.getItem('ussd-pending-graphs');
      return pending ? JSON.parse(pending) : [];
    }
  },

  async addPendingGraph(graphData) {
    try {
      const response = await fetch('/api/pending-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
      });
      return await response.json();
    } catch (error) {
      // Fallback to localStorage
      const pending = JSON.parse(localStorage.getItem('ussd-pending-graphs') || '[]');
      pending.push(graphData);
      localStorage.setItem('ussd-pending-graphs', JSON.stringify(pending));
    }
  },

  async approveGraph(graphId) {
    try {
      const response = await fetch(`/api/approve-graph/${graphId}`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      return false;
    }
  },

  async rejectGraph(graphId, reason) {
    try {
      const response = await fetch(`/api/reject-graph/${graphId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return await response.json();
    } catch (error) {
      return false;
    }
  }
};

  // Read operations
  async getApprovedGraphs() {
    try {
      await this.gitPull(); // Sync with latest
      const data = await fs.readFile(this.approvedPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading approved graphs:', error);
      return [];
    }
  }

  async getPendingGraphs() {
    try {
      await this.gitPull(); // Sync with latest
      const data = await fs.readFile(this.pendingPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading pending graphs:', error);
      return [];
    }
  }

  async getRejectedGraphs() {
    try {
      await this.gitPull(); // Sync with latest
      const data = await fs.readFile(this.rejectedPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading rejected graphs:', error);
      return [];
    }
  }

  // Write operations
  async setApprovedGraphs(graphs) {
    try {
      await fs.writeFile(this.approvedPath, JSON.stringify(graphs, null, 2));
      await this.gitAdd();
      await this.gitCommit('Update approved graphs');
      return true;
    } catch (error) {
      console.error('Error saving approved graphs:', error);
      return false;
    }
  }

  async setPendingGraphs(graphs) {
    try {
      await fs.writeFile(this.pendingPath, JSON.stringify(graphs, null, 2));
      await this.gitAdd();
      await this.gitCommit('Update pending graphs');
      return true;
    } catch (error) {
      console.error('Error saving pending graphs:', error);
      return false;
    }
  }

  async setRejectedGraphs(graphs) {
    try {
      await fs.writeFile(this.rejectedPath, JSON.stringify(graphs, null, 2));
      await this.gitAdd();
      await this.gitCommit('Update rejected graphs');
      return true;
    } catch (error) {
      console.error('Error saving rejected graphs:', error);
      return false;
    }
  }

  // Workflow operations
  async addPendingGraph(graphData) {
    const pending = await this.getPendingGraphs();
    pending.push(graphData);
    await this.setPendingGraphs(pending);
    console.log(`📤 Added graph "${graphData.metadata.name}" to pending review`);
  }

  async approveGraph(graphId) {
    const pending = await this.getPendingGraphs();
    const approved = await this.getApprovedGraphs();
    
    const graphIndex = pending.findIndex(g => g.id === graphId);
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = 'APPROVED';
      graph.metadata.approvedAt = new Date().toISOString();
      
      approved.push(graph);
      pending.splice(graphIndex, 1);
      
      await this.setApprovedGraphs(approved);
      await this.setPendingGraphs(pending);
      
      console.log(`✅ Approved graph "${graph.metadata.name}"`);
      return true;
    }
    return false;
  }

  async rejectGraph(graphId, reason) {
    const pending = await this.getPendingGraphs();
    const rejected = await this.getRejectedGraphs();
    
    const graphIndex = pending.findIndex(g => g.id === graphId);
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = 'REJECTED';
      graph.metadata.rejectedAt = new Date().toISOString();
      graph.metadata.rejectionReason = reason;
      
      rejected.push(graph);
      pending.splice(graphIndex, 1);
      
      await this.setRejectedGraphs(rejected);
      await this.setPendingGraphs(pending);
      
      console.log(`❌ Rejected graph "${graph.metadata.name}"`);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const localGitStorage = new LocalGitStorage();

// Browser-compatible wrapper for frontend
export const gitStorageWrapper = {
  async getApprovedGraphs() {
    try {
      // For development, we'll use a fetch to a local API endpoint
      const response = await fetch('/api/approved-graphs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching approved graphs:', error);
      // Fallback to localStorage for demo
      const approved = localStorage.getItem('ussd-approved-graphs');
      return approved ? JSON.parse(approved) : [];
    }
  },

  async getPendingGraphs() {
    try {
      const response = await fetch('/api/pending-graphs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pending graphs:', error);
      const pending = localStorage.getItem('ussd-pending-graphs');
      return pending ? JSON.parse(pending) : [];
    }
  },

  async addPendingGraph(graphData) {
    try {
      const response = await fetch('/api/pending-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding pending graph:', error);
      // Fallback to localStorage
      const pending = JSON.parse(localStorage.getItem('ussd-pending-graphs') || '[]');
      pending.push(graphData);
      localStorage.setItem('ussd-pending-graphs', JSON.stringify(pending));
    }
  },

  async approveGraph(graphId) {
    try {
      const response = await fetch(`/api/approve-graph/${graphId}`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      console.error('Error approving graph:', error);
      // Fallback logic
      return false;
    }
  },

  async rejectGraph(graphId, reason) {
    try {
      const response = await fetch(`/api/reject-graph/${graphId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return await response.json();
    } catch (error) {
      console.error('Error rejecting graph:', error);
      return false;
    }
  }
};
