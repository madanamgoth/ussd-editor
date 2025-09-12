// Browser-Safe Git Storage API
// Makes HTTP calls to Git server with localStorage fallback

import { browserStorageFallback } from './gitWorkflow.js';

class BrowserGitAPI {
  constructor() {
    this.serverUrl = 'http://localhost:3001';
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.serverUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`🔄 Git API call failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async getApprovedGraphs() {
    try {
      return await this.makeRequest('/api/approved-graphs');
    } catch (error) {
      console.warn('📁 Using localStorage fallback for approved graphs');
      const approved = localStorage.getItem('ussd-approved-graphs');
      return approved ? JSON.parse(approved) : [];
    }
  }

  async getPendingGraphs() {
    try {
      return await this.makeRequest('/api/pending-graphs');
    } catch (error) {
      console.warn('📁 Using localStorage fallback for pending graphs');
      const pending = localStorage.getItem('ussd-pending-graphs');
      return pending ? JSON.parse(pending) : [];
    }
  }

  async addPendingGraph(graphData) {
    try {
      const result = await this.makeRequest('/api/pending-graphs', {
        method: 'POST',
        body: JSON.stringify(graphData)
      });
      console.log('✅ Graph submitted via Git API');
      return result;
    } catch (error) {
      console.warn('📁 Using localStorage fallback for adding graph');
      // Fallback to localStorage
      const pending = JSON.parse(localStorage.getItem('ussd-pending-graphs') || '[]');
      pending.push(graphData);
      localStorage.setItem('ussd-pending-graphs', JSON.stringify(pending));
      return { success: true, message: 'Saved to localStorage', graphId: graphData.id };
    }
  }

  async approveGraph(graphId) {
    try {
      const result = await this.makeRequest(`/api/approve-graph/${graphId}`, {
        method: 'POST'
      });
      console.log('✅ Graph approved via Git API');
      return result;
    } catch (error) {
      console.warn('📁 Using localStorage fallback for approval');
      // Simple localStorage fallback
      browserStorageFallback.approveGraph(graphId);
      return { success: true, message: 'Approved via localStorage' };
    }
  }

  async rejectGraph(graphId, reason) {
    try {
      const result = await this.makeRequest(`/api/reject-graph/${graphId}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      console.log('✅ Graph rejected via Git API');
      return result;
    } catch (error) {
      console.warn('📁 Using localStorage fallback for rejection');
      // Simple localStorage fallback
      browserStorageFallback.rejectGraph(graphId, reason);
      return { success: true, message: 'Rejected via localStorage' };
    }
  }

  async checkHealth() {
    try {
      const health = await this.makeRequest('/api/health');
      console.log('🌐 Git API server status:', health.gitIntegration);
      return health;
    } catch (error) {
      return { 
        status: 'offline', 
        gitIntegration: 'disabled',
        message: 'Git server not available - using localStorage'
      };
    }
  }
}

// Export singleton instance
export const browserGitAPI = new BrowserGitAPI();
