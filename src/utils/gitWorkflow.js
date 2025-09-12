// Git workflow utilities for maker-checker process
import { exportToFlowFormat } from './flowUtils';

// Git workflow constants
export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MERGED: 'merged'
};

export const USER_ROLES = {
  MAKER: 'maker',
  CHECKER: 'checker'
};

// Initialize local git repository structure
export const initializeGitRepo = async () => {
  try {
    // Check if git is available
    const isGitAvailable = await checkGitAvailability();
    if (!isGitAvailable) {
      throw new Error('Git is not available. Please install Git to use version control features.');
    }

    // Initialize repo if not exists
    const repoExists = await checkRepoExists();
    if (!repoExists) {
      await executeGitCommand('git init');
      await executeGitCommand('git config user.name "USSD Editor"');
      await executeGitCommand('git config user.email "ussd@editor.local"');
      
      // Create initial structure
      await createInitialStructure();
    }

    return { success: true, message: 'Git repository initialized successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Create initial folder structure for workflows
const createInitialStructure = async () => {
  const folders = [
    'flows/approved',
    'flows/pending',
    'flows/rejected',
    'flows/drafts'
  ];

  for (const folder of folders) {
    try {
      await createDirectory(folder);
    } catch (error) {
      console.warn(`Could not create directory ${folder}:`, error);
    }
  }

  // Create initial gitignore
  const gitignoreContent = `
# Node modules
node_modules/

# Build outputs
dist/
build/

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
`;

  await writeFile('.gitignore', gitignoreContent);
  
  // Create initial commit
  await executeGitCommand('git add .');
  await executeGitCommand('git commit -m "Initial USSD Editor setup"');
};

// Get all approved graphs for selection
export const getApprovedGraphs = async () => {
  try {
    const approvedPath = 'flows/approved';
    const files = await listDirectory(approvedPath);
    
    const graphs = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(`${approvedPath}/${file}`);
          const data = JSON.parse(content);
          graphs.push({
            id: file.replace('.json', ''),
            name: data.metadata?.name || file.replace('.json', ''),
            description: data.metadata?.description || 'No description',
            version: data.metadata?.version || '1.0.0',
            lastModified: data.metadata?.lastModified || new Date().toISOString(),
            filePath: `${approvedPath}/${file}`,
            data: data
          });
        } catch (error) {
          console.warn(`Could not read graph file ${file}:`, error);
        }
      }
    }
    
    return { success: true, graphs };
  } catch (error) {
    return { success: false, error: error.message, graphs: [] };
  }
};

// Get pending graphs for checker review
export const getPendingGraphs = async () => {
  try {
    const pendingPath = 'flows/pending';
    const files = await listDirectory(pendingPath);
    
    const graphs = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(`${pendingPath}/${file}`);
          const data = JSON.parse(content);
          graphs.push({
            id: file.replace('.json', ''),
            name: data.metadata?.name || file.replace('.json', ''),
            description: data.metadata?.description || 'No description',
            version: data.metadata?.version || '1.0.0',
            submittedBy: data.metadata?.submittedBy || 'Unknown',
            submittedAt: data.metadata?.submittedAt || new Date().toISOString(),
            baseVersion: data.metadata?.baseVersion || null,
            isEdit: !!data.metadata?.baseVersion,
            filePath: `${pendingPath}/${file}`,
            data: data
          });
        } catch (error) {
          console.warn(`Could not read pending graph file ${file}:`, error);
        }
      }
    }
    
    // Sort by submission date (newest first)
    graphs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    return { success: true, graphs };
  } catch (error) {
    return { success: false, error: error.message, graphs: [] };
  }
};

// Submit graph for review (Maker action)
export const submitGraphForReview = async (nodes, edges, metadata = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const graphId = metadata.id || `graph_${Date.now()}`;
    
    // Generate version number
    let version = '1.0.0';
    if (metadata.baseVersion) {
      const baseParts = metadata.baseVersion.split('.');
      version = `${baseParts[0]}.${parseInt(baseParts[1]) + 1}.0`;
    }

    // Create comprehensive graph data
    const graphData = {
      id: graphId,
      nodes: nodes,
      edges: edges,
      metadata: {
        name: metadata.name || `USSD Flow ${graphId}`,
        description: metadata.description || 'No description provided',
        version: version,
        baseVersion: metadata.baseVersion || null,
        submittedBy: metadata.submittedBy || 'Unknown Maker',
        submittedAt: timestamp,
        status: WORKFLOW_STATUS.PENDING_REVIEW,
        ...metadata
      },
      flowData: exportToFlowFormat(nodes, edges),
      timestamp: timestamp
    };

    // Save to pending folder
    const fileName = `${graphId}.json`;
    const filePath = `flows/pending/${fileName}`;
    
    await writeFile(filePath, JSON.stringify(graphData, null, 2));
    
    // Git commit
    const commitMessage = metadata.baseVersion 
      ? `Update: ${graphData.metadata.name} v${version} (base: v${metadata.baseVersion})`
      : `New: ${graphData.metadata.name} v${version}`;
      
    await executeGitCommand(`git add "${filePath}"`);
    await executeGitCommand(`git commit -m "${commitMessage}"`);
    
    return { 
      success: true, 
      message: 'Graph submitted for review successfully',
      graphId: graphId,
      version: version
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Approve graph (Checker action)
export const approveGraph = async (graphId, checkerComments = '') => {
  try {
    const pendingFile = `flows/pending/${graphId}.json`;
    const content = await readFile(pendingFile);
    const graphData = JSON.parse(content);
    
    // Update metadata
    graphData.metadata.status = WORKFLOW_STATUS.APPROVED;
    graphData.metadata.approvedBy = 'Checker'; // Could be parameterized
    graphData.metadata.approvedAt = new Date().toISOString();
    graphData.metadata.checkerComments = checkerComments;
    
    // Move to approved folder
    const approvedFile = `flows/approved/${graphId}.json`;
    await writeFile(approvedFile, JSON.stringify(graphData, null, 2));
    
    // Remove from pending
    await deleteFile(pendingFile);
    
    // Git operations
    await executeGitCommand(`git add "${approvedFile}"`);
    await executeGitCommand(`git rm "${pendingFile}"`);
    await executeGitCommand(`git commit -m "Approve: ${graphData.metadata.name} v${graphData.metadata.version}"`);
    
    // Create version tag
    const tagName = `${graphId}-v${graphData.metadata.version}`;
    await executeGitCommand(`git tag "${tagName}"`);
    
    return { 
      success: true, 
      message: 'Graph approved successfully',
      version: graphData.metadata.version
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Reject graph (Checker action)
export const rejectGraph = async (graphId, rejectionReason = '') => {
  try {
    const pendingFile = `flows/pending/${graphId}.json`;
    const content = await readFile(pendingFile);
    const graphData = JSON.parse(content);
    
    // Update metadata
    graphData.metadata.status = WORKFLOW_STATUS.REJECTED;
    graphData.metadata.rejectedBy = 'Checker'; // Could be parameterized
    graphData.metadata.rejectedAt = new Date().toISOString();
    graphData.metadata.rejectionReason = rejectionReason;
    
    // Move to rejected folder
    const rejectedFile = `flows/rejected/${graphId}.json`;
    await writeFile(rejectedFile, JSON.stringify(graphData, null, 2));
    
    // Remove from pending
    await deleteFile(pendingFile);
    
    // Git operations
    await executeGitCommand(`git add "${rejectedFile}"`);
    await executeGitCommand(`git rm "${pendingFile}"`);
    await executeGitCommand(`git commit -m "Reject: ${graphData.metadata.name} v${graphData.metadata.version} - ${rejectionReason}"`);
    
    return { 
      success: true, 
      message: 'Graph rejected successfully'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Load specific graph data
export const loadGraphData = async (filePath) => {
  try {
    const content = await readFile(filePath);
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get graph history and versions
export const getGraphHistory = async (graphId) => {
  try {
    const result = await executeGitCommand(`git log --oneline --grep="${graphId}"`);
    const commits = result.split('\n').filter(line => line.trim());
    
    const history = commits.map(commit => {
      const [hash, ...messageParts] = commit.split(' ');
      return {
        hash: hash,
        message: messageParts.join(' '),
        date: new Date().toISOString() // Git log would need different format for actual date
      };
    });
    
    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message, history: [] };
  }
};

// Utility functions for file operations (these would be implemented based on your environment)
const executeGitCommand = async (command) => {
  // This would be implemented using Node.js child_process or similar
  // For browser environment, you might need a different approach
  console.log('Git command:', command);
  return Promise.resolve(''); // Placeholder
};

const checkGitAvailability = async () => {
  try {
    await executeGitCommand('git --version');
    return true;
  } catch (error) {
    return false;
  }
};

const checkRepoExists = async () => {
  try {
    await executeGitCommand('git status');
    return true;
  } catch (error) {
    return false;
  }
};

const createDirectory = async (path) => {
  // Implementation depends on environment
  console.log('Create directory:', path);
  return Promise.resolve();
};

const writeFile = async (path, content) => {
  // Implementation depends on environment
  console.log('Write file:', path);
  return Promise.resolve();
};

const readFile = async (path) => {
  // Implementation depends on environment
  console.log('Read file:', path);
  return Promise.resolve('{}');
};

const deleteFile = async (path) => {
  // Implementation depends on environment
  console.log('Delete file:', path);
  return Promise.resolve();
};

const listDirectory = async (path) => {
  // Implementation depends on environment
  console.log('List directory:', path);
  return Promise.resolve([]);
};

// For browser-based implementation, we'll use localStorage as a fallback
export const browserStorageFallback = {
  // Store approved graphs in localStorage
  getApprovedGraphs: () => {
    const approved = localStorage.getItem('ussd-approved-graphs');
    return approved ? JSON.parse(approved) : [];
  },
  
  setApprovedGraphs: (graphs) => {
    localStorage.setItem('ussd-approved-graphs', JSON.stringify(graphs));
  },
  
  // Store pending graphs in localStorage
  getPendingGraphs: () => {
    const pending = localStorage.getItem('ussd-pending-graphs');
    return pending ? JSON.parse(pending) : [];
  },
  
  setPendingGraphs: (graphs) => {
    localStorage.setItem('ussd-pending-graphs', JSON.stringify(graphs));
  },
  
  // Add graph to pending
  addPendingGraph: (graphData) => {
    const pending = browserStorageFallback.getPendingGraphs();
    pending.push(graphData);
    browserStorageFallback.setPendingGraphs(pending);
  },
  
  // Move from pending to approved
  approveGraph: (graphId) => {
    const pending = browserStorageFallback.getPendingGraphs();
    const approved = browserStorageFallback.getApprovedGraphs();
    
    const graphIndex = pending.findIndex(g => g.id === graphId);
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = WORKFLOW_STATUS.APPROVED;
      graph.metadata.approvedAt = new Date().toISOString();
      
      approved.push(graph);
      pending.splice(graphIndex, 1);
      
      browserStorageFallback.setApprovedGraphs(approved);
      browserStorageFallback.setPendingGraphs(pending);
    }
  },
  
  // Remove from pending (reject)
  rejectGraph: (graphId, reason) => {
    const pending = browserStorageFallback.getPendingGraphs();
    const graphIndex = pending.findIndex(g => g.id === graphId);
    
    if (graphIndex >= 0) {
      const graph = pending[graphIndex];
      graph.metadata.status = WORKFLOW_STATUS.REJECTED;
      graph.metadata.rejectedAt = new Date().toISOString();
      graph.metadata.rejectionReason = reason;
      
      // Store in rejected (could be separate storage)
      const rejected = localStorage.getItem('ussd-rejected-graphs');
      const rejectedGraphs = rejected ? JSON.parse(rejected) : [];
      rejectedGraphs.push(graph);
      localStorage.setItem('ussd-rejected-graphs', JSON.stringify(rejectedGraphs));
      
      pending.splice(graphIndex, 1);
      browserStorageFallback.setPendingGraphs(pending);
    }
  }
};
