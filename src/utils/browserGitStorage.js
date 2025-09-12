// Browser-Safe Git Storage Wrapper
// This runs in the browser and talks to the Git server via API

// Browser wrapper for Git storage (no Node.js dependencies)
export const gitStorageWrapper = {
  async getApprovedGraphs() {
    try {
      console.log('🌐 Fetching approved graphs from Git server...');
      const response = await fetch('/api/approved-graphs');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const graphs = await response.json();
      console.log('✅ Loaded approved graphs:', graphs.length);
      return graphs;
    } catch (error) {
      console.error('❌ Error fetching approved graphs:', error);
      console.log('🔄 Falling back to localStorage...');
      // Fallback to localStorage
      const approved = localStorage.getItem('ussd-approved-graphs');
      return approved ? JSON.parse(approved) : [];
    }
  },

  async getPendingGraphs() {
    try {
      console.log('🌐 Fetching pending graphs from Git server...');
      const response = await fetch('/api/pending-graphs');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const graphs = await response.json();
      console.log('✅ Loaded pending graphs:', graphs.length);
      return graphs;
    } catch (error) {
      console.error('❌ Error fetching pending graphs:', error);
      console.log('🔄 Falling back to localStorage...');
      // Fallback to localStorage
      const pending = localStorage.getItem('ussd-pending-graphs');
      return pending ? JSON.parse(pending) : [];
    }
  },

  async addPendingGraph(graphData) {
    try {
      console.log('🌐 Submitting graph to Git server...');
      const response = await fetch('/api/pending-graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      console.log('✅ Graph submitted to Git server:', result);
      return result;
    } catch (error) {
      console.error('❌ Error submitting to Git server:', error);
      console.log('🔄 Falling back to localStorage...');
      // Fallback to localStorage
      const pending = JSON.parse(localStorage.getItem('ussd-pending-graphs') || '[]');
      pending.push(graphData);
      localStorage.setItem('ussd-pending-graphs', JSON.stringify(pending));
      return { success: true, fallback: true };
    }
  },

  async approveGraph(graphId) {
    try {
      console.log('🌐 Approving graph via Git server...');
      const response = await fetch(`/api/approve-graph/${graphId}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      console.log('✅ Graph approved via Git server:', result);
      return result;
    } catch (error) {
      console.error('❌ Error approving via Git server:', error);
      console.log('🔄 Using localStorage fallback...');
      return { success: false, error: error.message };
    }
  },

  async rejectGraph(graphId, reason) {
    try {
      console.log('🌐 Rejecting graph via Git server...');
      const response = await fetch(`/api/reject-graph/${graphId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      console.log('✅ Graph rejected via Git server:', result);
      return result;
    } catch (error) {
      console.error('❌ Error rejecting via Git server:', error);
      console.log('🔄 Using localStorage fallback...');
      return { success: false, error: error.message };
    }
  },

  // Check if Git server is available
  async checkServerHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const health = await response.json();
      console.log('🏥 Git server health:', health);
      return health;
    } catch (error) {
      console.error('❌ Git server not available:', error);
      return { status: 'offline', gitIntegration: 'disabled' };
    }
  }
};
