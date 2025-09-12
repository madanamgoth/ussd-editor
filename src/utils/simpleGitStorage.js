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
        // Ensure Git repo is initialized
        await this.ensureGitRepo();
        
        // Only commit if there are actually changes
        const status = await this.gitStatus();
        if (status) {
          await this.gitCommit('Initialize workflow data');
        }
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

  // Optimized Git operations
  async gitCommit(message) {
    if (!this.gitAvailable) return;
    
    try {
      const startTime = Date.now();
      
      // Check if there are changes to commit first
      const { stdout: status } = await execAsync('git status --porcelain');
      if (!status.trim()) {
        console.log('ℹ️  No changes to commit');
        return;
      }
      
      // Use more efficient git commands
      await execAsync(`git add "${this.dataDir}"`);
      
      // Check if there's anything staged
      const { stdout: staged } = await execAsync('git diff --cached --name-only');
      if (!staged.trim()) {
        console.log('ℹ️  No changes staged for commit');
        return;
      }
      
      await execAsync(`git commit -m "${message}" --quiet`);
      
      const duration = Date.now() - startTime;
      console.log(`📝 Git commit: ${message} (${duration}ms)`);
    } catch (error) {
      console.log('ℹ️  Git commit info:', error.message);
    }
  }

  // Add git status check method
  async gitStatus() {
    if (!this.gitAvailable) return '';
    
    try {
      const { stdout } = await execAsync('git status --porcelain');
      return stdout.trim();
    } catch (error) {
      console.log('ℹ️  Git status info:', error.message);
      return '';
    }
  }

  // Add method to check if Git repo is initialized
  async ensureGitRepo() {
    if (!this.gitAvailable) return false;
    
    try {
      await execAsync('git rev-parse --git-dir');
      return true;
    } catch (error) {
      console.log('🔧 Initializing Git repository...');
      try {
        await execAsync('git init');
        await execAsync('git config user.email "ussd-editor@local"');
        await execAsync('git config user.name "USSD Editor"');
        console.log('✅ Git repository initialized');
        return true;
      } catch (initError) {
        console.log('❌ Failed to initialize Git repo:', initError.message);
        return false;
      }
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

  // Write operations with timing
  async setApprovedGraphs(graphs) {
    const startTime = Date.now();
    await fs.writeFile(this.approvedPath, JSON.stringify(graphs, null, 2));
    const writeTime = Date.now() - startTime;
    console.log(`💾 File write: ${writeTime}ms`);
    
    await this.gitCommit('Update approved graphs');
  }

  async setPendingGraphs(graphs) {
    const startTime = Date.now();
    await fs.writeFile(this.pendingPath, JSON.stringify(graphs, null, 2));
    const writeTime = Date.now() - startTime;
    console.log(`💾 File write: ${writeTime}ms`);
    
    await this.gitCommit('Update pending graphs');
  }

  // Diagnostic method to check Git performance
  async testGitPerformance() {
    if (!this.gitAvailable) return;
    
    console.log('🔍 Testing Git performance...');
    
    const tests = [
      ['git --version', 'Version check'],
      ['git status --porcelain', 'Status check'],
      ['git log --oneline -1', 'Log check'],
      ['git config --list', 'Config check']
    ];
    
    for (const [command, description] of tests) {
      try {
        const startTime = Date.now();
        await execAsync(command);
        const duration = Date.now() - startTime;
        console.log(`  ${description}: ${duration}ms`);
      } catch (error) {
        console.log(`  ${description}: ERROR - ${error.message}`);
      }
    }
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
      
      // 🔍 COMMIT ANALYSIS FOR APPROVAL
      console.log('📋 APPROVAL COMMIT ANALYSIS:');
      console.log('  📌 Approving graph:', graph.metadata.name);
      console.log('  📌 Version:', graph.metadata.version);
      console.log('  📌 Is edit of existing?', graph.metadata.baseVersion ? 'YES' : 'NO');
      if (graph.metadata.baseVersion) {
        console.log('  📌 Based on version:', graph.metadata.baseVersion);
        console.log('  📌 Original graph stays in approved list (not modified)');
        console.log('  📌 This NEW version gets added to approved list');
      }
      
      graph.metadata.status = 'APPROVED';
      graph.metadata.approvedAt = new Date().toISOString();
      
      // ✅ Add NEW version to approved (original stays if it exists)
      approved.push(graph);
      
      // ✅ Remove from pending (submitted version moves to approved)
      pending.splice(graphIndex, 1);
      
      await this.setApprovedGraphs(approved);
      await this.setPendingGraphs(pending);
      
      console.log(`✅ Approved graph "${graph.metadata.name}" version ${graph.metadata.version}`);
      console.log('📊 Approved graphs count:', approved.length);
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
