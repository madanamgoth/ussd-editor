import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap
} from '@xyflow/react';
import { nodeTypes } from './NodeTypes';
import CustomEdge from './CustomEdge';
import DualCanvasComparison from './DualCanvasComparison_Clean';
import {
  browserStorageFallback,
  WORKFLOW_STATUS,
  USER_ROLES
} from '../utils/gitWorkflow';
import { browserGitAPI } from '../utils/browserGitAPI';
import { gitStorageWrapper } from '../utils/browserGitStorage';
import { initializeSampleData } from '../utils/sampleData';
import './MakerCheckerWorkflow.css';
import './CanvasReview.css';

const edgeTypes = {
  custom: CustomEdge,
};

const MakerCheckerWorkflow = ({ 
  nodes, 
  edges, 
  onClose, 
  onLoadGraph, 
  currentUserRole = USER_ROLES.MAKER,
  onClearCanvas,
  isEditingFromApproved = false,
  setIsEditingFromApproved,
  baseGraphForEditing = null,
  setBaseGraphForEditing,
  onEditFromApprovedComplete,
  onStartComparison
}) => {
  const [activeTab, setActiveTab] = useState('maker');
  const [approvedGraphs, setApprovedGraphs] = useState([]);
  const [pendingGraphs, setPendingGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showCanvasReview, setShowCanvasReview] = useState(false);
  const [comparisonMode, setComparisonMode] = useState('side-by-side'); // 'side-by-side' or 'top-bottom'
  const [submissionData, setSubmissionData] = useState({
    name: '',
    description: '',
    baseVersion: null,
    submittedBy: 'Maker User'
  });
  const [reviewData, setReviewData] = useState({
    comments: '',
    rejectionReason: ''
  });
  // Remove local state since we're using props now
  // const [isEditingFromApproved, setIsEditingFromApproved] = useState(false);
  // const [baseGraphForEditing, setBaseGraphForEditing] = useState(null);

  // Load data on component mount
  useEffect(() => {
    console.log('🚀 MakerCheckerWorkflow component mounted, initializing data...');
    // Initialize with sample data if none exists
    const sampleStats = initializeSampleData();
    console.log('📊 Sample data stats:', sampleStats);
    loadApprovedGraphs();
    loadPendingGraphs();
    
    // If editing from approved, set up submission data
    if (isEditingFromApproved && baseGraphForEditing) {
      setSubmissionData({
        name: `${baseGraphForEditing.metadata.name} (Updated)`,
        description: baseGraphForEditing.metadata.description,
        baseVersion: baseGraphForEditing.metadata.version,
        submittedBy: 'Maker User'
      });
    }
  }, [isEditingFromApproved, baseGraphForEditing]);

  const loadApprovedGraphs = async () => {
    try {
      console.log('📡 Loading approved graphs from Git API...');
      const graphs = await browserGitAPI.getApprovedGraphs();
      console.log('✅ Loaded approved graphs:', graphs.length);
      setApprovedGraphs(graphs);
    } catch (error) {
      console.error('❌ Error loading approved graphs:', error);
      // Already handled in browserGitAPI with localStorage fallback
    }
  };

  const loadPendingGraphs = async () => {
    try {
      console.log('📡 Loading pending graphs from Git API...');
      const graphs = await browserGitAPI.getPendingGraphs();
      console.log('✅ Loaded pending graphs:', graphs.length);
      setPendingGraphs(graphs);
    } catch (error) {
      console.error('❌ Error loading pending graphs:', error);
      // Already handled in browserGitAPI with localStorage fallback
    }
  };

  const handleCreateNew = () => {
    if (nodes.length > 0) {
      if (window.confirm('This will clear the current canvas. Do you want to save your work first?')) {
        setIsEditingFromApproved(false);
        setBaseGraphForEditing(null);
        onClearCanvas();
        onClose();
      }
    } else {
      setIsEditingFromApproved(false);
      setBaseGraphForEditing(null);
      onClearCanvas();
      onClose();
    }
  };

  const handleEditApproved = (graph) => {
    console.log('✏️ Editing approved graph:', graph.metadata.name);
    console.log('📊 Original graph data (READ-ONLY):', {
      nodes: graph.nodes?.length || 0,
      edges: graph.edges?.length || 0,
      version: graph.metadata.version
    });
    
    // ⚠️ IMPORTANT: Original graph should NEVER be modified
    // We create a deep copy for editing to preserve the original
    
    // Set up submission data for the NEW version
    setSubmissionData({
      name: `${graph.metadata.name} (Updated)`,
      description: graph.metadata.description,
      baseVersion: graph.metadata.version, // Reference to original version
      submittedBy: 'Maker User'
    });
    
    // ✅ Deep copy the ORIGINAL graph data for reference (preserve immutability)
    const originalGraphCopy = JSON.parse(JSON.stringify(graph));
    setBaseGraphForEditing(originalGraphCopy);
    setIsEditingFromApproved(true);
    
    // ✅ Create a NEW working copy for canvas editing (this will be modified)
    const workingNodesCopy = JSON.parse(JSON.stringify(graph.nodes || []));
    const workingEdgesCopy = JSON.parse(JSON.stringify(graph.edges || []));
    
    console.log('📋 Created working copies for editing:', {
      originalNodes: graph.nodes?.length,
      workingNodes: workingNodesCopy.length,
      originalEdges: graph.edges?.length, 
      workingEdges: workingEdgesCopy.length
    });
    
    // Load the WORKING COPY onto the canvas (original stays untouched)
    console.log('🔄 Loading WORKING COPY to canvas for editing');
    onLoadGraph(workingNodesCopy, workingEdgesCopy);
    
    // Close the workflow modal
    onClose();
    
    console.log('🎯 Graph loaded for editing. Floating submit button should now appear.');
  };

  const handleSubmitForReview = async () => {
    console.log('🚀 Submit for Review clicked. Current submission data:', submissionData);
    console.log('📊 Nodes count:', nodes.length, 'Edges count:', edges.length);
    
    if (!submissionData.name.trim()) {
      console.warn('❌ Submission failed: Name is required');
      alert('Please provide a name for the graph');
      return;
    }

    const timestamp = new Date().toISOString();
    const graphId = `graph_${Date.now()}`;
    
    let version = '1.0.0';
    if (submissionData.baseVersion) {
      const baseParts = submissionData.baseVersion.split('.');
      version = `${baseParts[0]}.${parseInt(baseParts[1]) + 1}.0`;
    }

    // 🔍 IMPORTANT: Check what we're committing
    console.log('📋 COMMIT ANALYSIS:');
    console.log('  📌 Is this an edit?', isEditingFromApproved);
    console.log('  📌 Base version:', submissionData.baseVersion);
    console.log('  📌 New version:', version);
    console.log('  📌 Original graph will stay in approved-graphs.json');
    console.log('  📌 Only THIS new version goes to pending-graphs.json');

    const graphData = {
      id: graphId,
      nodes: nodes, // ✅ Only NEW edited nodes
      edges: edges, // ✅ Only NEW edited edges  
      metadata: {
        name: submissionData.name,
        description: submissionData.description,
        version: version, // ✅ NEW version (1.1.0)
        baseVersion: submissionData.baseVersion, // ✅ Link to original (1.0.0)
        submittedBy: submissionData.submittedBy,
        submittedAt: timestamp,
        status: WORKFLOW_STATUS.PENDING_REVIEW
      },
      timestamp: timestamp,
      isEdit: isEditingFromApproved,
      baseGraph: baseGraphForEditing // ✅ Reference for comparison only
    };

    console.log('📝 Submitting graph for review:', graphData);
    
    try {
      // Save to Git API
      console.log('📡 Saving to Git API...');
      await browserGitAPI.addPendingGraph(graphData);
      console.log('✅ Graph saved successfully');
      
      // Reload data
      await loadPendingGraphs();
      
      alert(`Graph "${submissionData.name}" submitted for review!`);
    } catch (error) {
      console.error('❌ Error saving graph:', error);
      alert(`Graph "${submissionData.name}" submitted for review! (Error: ${error.message})`);
    }
    
    // Close the submission form
    setShowSubmissionForm(false);
    
    // If this was editing from approved, call the callback
    if (isEditingFromApproved && onEditFromApprovedComplete) {
      onEditFromApprovedComplete();
    } else {
      // Clear form for new submissions
      setSubmissionData({
        name: '',
        description: '',
        baseVersion: null,
        submittedBy: 'Maker User'
      });
    }
  };

  const handleReviewGraph = (graph) => {
    console.log('🔍 Review button clicked for graph:', graph);
    console.log('📊 Graph details:', {
      name: graph.metadata.name,
      version: graph.metadata.version,
      baseVersion: graph.metadata.baseVersion,
      nodes: graph.nodes?.length,
      edges: graph.edges?.length,
      nodeIds: graph.nodes?.map(n => `${n.type}:${n.id}`)
    });
    
    setSelectedGraph(graph);
    
    // Check if this is an edited graph (has baseVersion) or new graph from scratch
    if (graph.metadata.baseVersion) {
      console.log('🔍 Looking for original graph with baseVersion:', graph.metadata.baseVersion);
      console.log('📋 Available approved graphs:', approvedGraphs.map(g => ({
        name: g.metadata.name,
        version: g.metadata.version,
        nodeCount: g.nodes?.length
      })));
      
      const originalGraph = findBaseGraph(graph.metadata.baseVersion);
      
      if (originalGraph) {
        console.log('✅ Found original graph for comparison:');
        console.log('📊 ORIGINAL (LEFT):', {
          name: originalGraph.metadata.name,
          version: originalGraph.metadata.version,
          nodes: originalGraph.nodes?.length,
          edges: originalGraph.edges?.length,
          nodeIds: originalGraph.nodes?.map(n => `${n.type}:${n.id}`)
        });
        console.log('📊 EDITED (RIGHT):', {
          name: graph.metadata.name,
          version: graph.metadata.version,
          nodes: graph.nodes?.length,
          edges: graph.edges?.length,
          nodeIds: graph.nodes?.map(n => `${n.type}:${n.id}`)
        });
        
        // ✅ Set the ACTUAL original graph for comparison
        setBaseGraphForEditing(originalGraph);
        setSelectedSubmission(graph);
        setShowComparison(true);
      } else {
        console.warn('⚠️ Base graph not found for version:', graph.metadata.baseVersion);
        console.warn('📋 This will show single canvas review instead');
        setShowCanvasReview(true);
      }
    } else {
      // This is new graph from scratch - show single canvas review
      console.log('📋 New graph from scratch - using single canvas review');
      setShowCanvasReview(true);
    }
  };

  const handleApproveGraph = async () => {
    const graphToApprove = selectedSubmission || selectedGraph;
    if (!graphToApprove) return;

    try {
      console.log('📡 Approving graph via Git API...', graphToApprove.metadata.name);
      await browserGitAPI.approveGraph(graphToApprove.id);
      console.log('✅ Graph approved successfully');
      
      await loadApprovedGraphs();
      await loadPendingGraphs();
      
      alert(`Graph "${graphToApprove.metadata.name}" approved successfully!`);
    } catch (error) {
      console.error('❌ Error approving graph:', error);
      alert(`Graph "${graphToApprove.metadata.name}" approved! (Error: ${error.message})`);
    }
    
    setSelectedGraph(null);
    setSelectedSubmission(null);
    setBaseGraphForEditing(null);
    setShowComparison(false);
    setShowCanvasReview(false);
  };

  const handleRejectGraph = async () => {
    const graphToReject = selectedSubmission || selectedGraph;
    if (!graphToReject) return;

    // Use prompt for rejection reason to keep UI consistent
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      console.log('📡 Rejecting graph via Git API...', graphToReject.metadata.name);
      await browserGitAPI.rejectGraph(graphToReject.id, rejectionReason.trim());
      console.log('✅ Graph rejected successfully');
      
      await loadPendingGraphs();
      
      alert(`Graph "${graphToReject.metadata.name}" rejected.`);
    } catch (error) {
      console.error('❌ Error rejecting graph:', error);
      alert(`Graph "${graphToReject.metadata.name}" rejected! (Error: ${error.message})`);
    }
    
    setSelectedGraph(null);
    setSelectedSubmission(null);
    setBaseGraphForEditing(null);
    setShowComparison(false);
    setShowCanvasReview(false);
    setReviewData({ comments: '', rejectionReason: '' });
  };

  const renderMakerInterface = () => (
    <div className="workflow-tab-content">
      <div className="workflow-section">
        <h3>Create New Graph</h3>
        <p className="section-description">Start with a clean canvas to create a new USSD flow</p>
        <button 
          className="workflow-btn primary"
          onClick={handleCreateNew}
        >
          🆕 Create New Graph
        </button>
      </div>

      <div className="workflow-section">
        <h3>Edit Approved Graph</h3>
        <p className="section-description">Select an approved graph to create a new version</p>
        
        {approvedGraphs.length === 0 ? (
          <div className="empty-state">
            <p>No approved graphs available</p>
          </div>
        ) : (
          <div className="graph-list">
            {approvedGraphs.map((graph) => (
              <div key={graph.id} className="graph-item">
                <div className="graph-info">
                  <h4>{graph.metadata.name}</h4>
                  <p className="graph-description">{graph.metadata.description}</p>
                  <div className="graph-meta">
                    <span className="version">v{graph.metadata.version}</span>
                    <span className="date">
                      {new Date(graph.metadata.approvedAt || graph.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button 
                  className="workflow-btn secondary"
                  onClick={() => handleEditApproved(graph)}
                >
                  ✏️ Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="workflow-section">
        <h3>Submit Current Graph</h3>
        <p className="section-description">Submit your current work for review</p>
        
        {nodes.length === 0 ? (
          <div className="empty-state">
            <p>No graph on canvas to submit</p>
          </div>
        ) : (
          <button 
            className="workflow-btn success"
            onClick={() => setShowSubmissionForm(true)}
          >
            📤 Submit for Review ({nodes.length} nodes)
          </button>
        )}
      </div>
    </div>
  );

  const renderCheckerInterface = () => {
    console.log('🏗️ Rendering checker interface. Pending graphs:', pendingGraphs.length);
    return (
    <div className="workflow-tab-content">
      <div className="workflow-section">
        <h3>Pending Reviews</h3>
        <p className="section-description">Graphs waiting for your review and approval</p>
        
        {pendingGraphs.length === 0 ? (
          <div className="empty-state">
            <p>No graphs pending review</p>
          </div>
        ) : (
          <div className="graph-list">
            {pendingGraphs.map((graph) => {
              console.log('🔍 Rendering graph item:', graph.id, graph.metadata?.name);
              return (
              <div key={graph.id} className="graph-item pending">
                <div className="graph-info">
                  <h4>{graph.metadata.name}</h4>
                  <p className="graph-description">{graph.metadata.description}</p>
                  <div className="graph-meta">
                    <span className="version">v{graph.metadata.version}</span>
                    {graph.metadata.baseVersion && (
                      <span className="base-version">
                        (updated from v{graph.metadata.baseVersion})
                      </span>
                    )}
                    <span className="submitter">by {graph.metadata.submittedBy}</span>
                    <span className="date">
                      {new Date(graph.metadata.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {graph.metadata.baseVersion && (
                    <div className="edit-indicator">
                      ✏️ This is an update to an existing graph
                    </div>
                  )}
                </div>
                <button 
                  className="workflow-btn primary"
                  onClick={() => {
                    console.log('🚀 Review button clicked!', graph.id);
                    handleReviewGraph(graph);
                  }}
                >
                  👀 Review
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );};

  const renderSubmissionForm = () => (
    <div className="modal-overlay">
      <div className="submission-modal">
        <div className="modal-header">
          <h3>Submit Graph for Review</h3>
          <button 
            className="close-btn"
            onClick={() => setShowSubmissionForm(false)}
          >
            ×
          </button>
        </div>
        
        <div className="form-content">
          <div className="form-group">
            <label>Graph Name *</label>
            <input 
              type="text"
              value={submissionData.name}
              onChange={(e) => setSubmissionData({
                ...submissionData,
                name: e.target.value
              })}
              placeholder="Enter a descriptive name for this graph"
              maxLength={100}
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={submissionData.description}
              onChange={(e) => setSubmissionData({
                ...submissionData,
                description: e.target.value
              })}
              placeholder="Describe what this USSD flow does..."
              rows={3}
              maxLength={500}
            />
          </div>
          
          {submissionData.baseVersion && (
            <div className="form-group">
              <label>Base Version</label>
              <div className="base-version-info">
                This is an update to version {submissionData.baseVersion}
              </div>
            </div>
          )}
          
          <div className="graph-summary">
            <h4>Graph Summary</h4>
            <div className="summary-stats">
              <span>📊 {nodes.length} nodes</span>
              <span>🔗 {edges.length} connections</span>
              <span>📋 {nodes.filter(n => n.type === 'menu').length} menus</span>
              <span>📝 {nodes.filter(n => n.type === 'input').length} inputs</span>
              <span>⚙️ {nodes.filter(n => n.type === 'action').length} actions</span>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="workflow-btn secondary"
            onClick={() => setShowSubmissionForm(false)}
          >
            Cancel
          </button>
          <button 
            className="workflow-btn success"
            onClick={handleSubmitForReview}
          >
            📤 Submit for Review
          </button>
        </div>
      </div>
    </div>
  );

  const findBaseGraph = (baseVersion) => {
    console.log('🔍 Looking for base graph with version:', baseVersion);
    console.log('📋 Available approved graphs:', approvedGraphs.map(g => ({
      name: g.metadata.name,
      version: g.metadata.version,
      nodes: g.nodes?.length,
      edges: g.edges?.length
    })));
    
    const baseGraph = approvedGraphs.find(g => g.metadata.version === baseVersion);
    console.log('🎯 Found base graph:', baseGraph ? {
      name: baseGraph.metadata.name,
      version: baseGraph.metadata.version,
      nodes: baseGraph.nodes?.length,
      edges: baseGraph.edges?.length
    } : 'NOT FOUND');
    
    return baseGraph;
  };

  const renderComparison = () => {
    if (!selectedSubmission || !baseGraphForEditing) {
      console.error('❌ Missing data for comparison:', {
        hasSelectedSubmission: !!selectedSubmission,
        hasBaseGraphForEditing: !!baseGraphForEditing
      });
      return null;
    }
    
    console.log('🔄 Comparison rendering with data:');
    console.log('📊 ORIGINAL GRAPH (LEFT CANVAS):', {
      name: baseGraphForEditing.metadata?.name,
      version: baseGraphForEditing.metadata?.version,
      nodes: baseGraphForEditing.nodes?.length,
      edges: baseGraphForEditing.edges?.length,
      nodeIds: baseGraphForEditing.nodes?.map(n => `${n.type}:${n.id}`)
    });
    console.log('📊 EDITED GRAPH (RIGHT CANVAS):', {
      name: selectedSubmission.metadata?.name,
      version: selectedSubmission.metadata?.version,
      nodes: selectedSubmission.nodes?.length,
      edges: selectedSubmission.edges?.length,
      nodeIds: selectedSubmission.nodes?.map(n => `${n.type}:${n.id}`)
    });
    
    // ✅ Verify data is different
    const originalNodeIds = baseGraphForEditing.nodes?.map(n => n.id).sort() || [];
    const editedNodeIds = selectedSubmission.nodes?.map(n => n.id).sort() || [];
    console.log('🔍 Data comparison check:', {
      originalIds: originalNodeIds,
      editedIds: editedNodeIds,
      areIdentical: JSON.stringify(originalNodeIds) === JSON.stringify(editedNodeIds)
    });
    
    // ✅ Use the ORIGINAL approved graph vs the EDITED submission
    const originalGraph = baseGraphForEditing;  // Original approved graph from approved-graphs.json
    const editedGraph = selectedSubmission;     // Edited version from pending-graphs.json
    
    return (
      <DualCanvasComparison
        originalGraph={originalGraph}
        editedGraph={editedGraph}
        comparisonMode={comparisonMode}
        onModeChange={setComparisonMode}
        onApprove={handleApproveGraph}
        onReject={handleRejectGraph}
        graphName={selectedSubmission.metadata.name}
      />
    );
  };

  const renderCanvasReview = () => {
    if (!selectedGraph) return null;
    
    return (
      <div className="dual-canvas-comparison single-canvas-mode">
        <div className="comparison-header">
          <div className="header-section">
            <h3>📋 {selectedGraph.metadata.name} v{selectedGraph.metadata.version} 
              <span className="graph-stat">({selectedGraph.nodes.length} nodes, {selectedGraph.edges.length} edges)</span>
            </h3>
          </div>
          
          <div className="comparison-controls-inline">
            <div className="review-title">
              🔍 Reviewing • {selectedGraph.metadata.description} • By: {selectedGraph.metadata.submittedBy}
            </div>
            
            <div className="all-controls">
              <button 
                className="review-btn-compact reject-btn"
                onClick={handleRejectGraph}
              >
                ❌ Reject
              </button>
              <button 
                className="review-btn-compact approve-btn"
                onClick={handleApproveGraph}
              >
                ✅ Approve
              </button>
            </div>
          </div>
          
          <div className="header-section">
            <div className="close-controls">
              <button 
                className="close-btn"
                onClick={() => {
                  setShowCanvasReview(false);
                  setSelectedGraph(null);
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="comparison-legend" style={{display: 'none'}}>
          {/* Hidden since info is now in header */}
        </div>

        <div className="canvas-container single-canvas">
          <div className="canvas-section full-width">
            <div className="canvas-title">New Graph for Review</div>
            <ReactFlow
              nodes={selectedGraph.nodes}
              edges={selectedGraph.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="workflow-overlay">
      <div className="workflow-modal">
        <div className="workflow-header">
          <h2>🔄 Maker-Checker Workflow</h2>
          <div className="demo-notice">
            📋 Demo Mode - Sample data loaded
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="workflow-tabs">
          <button 
            className={`tab-btn ${activeTab === 'maker' ? 'active' : ''}`}
            onClick={() => setActiveTab('maker')}
          >
            🛠️ Maker
          </button>
          <button 
            className={`tab-btn ${activeTab === 'checker' ? 'active' : ''}`}
            onClick={() => setActiveTab('checker')}
          >
            ✅ Checker
          </button>
        </div>
        
        <div className="workflow-content">
          {activeTab === 'maker' ? renderMakerInterface() : renderCheckerInterface()}
        </div>
      </div>
      
      {showSubmissionForm && renderSubmissionForm()}
      {showComparison && renderComparison()}
      {showCanvasReview && renderCanvasReview()}
    </div>,
    document.body
  );
};

// Graph Preview Component
const GraphPreview = ({ nodes, edges, isBase, comparisonNodes = [] }) => {
  const getNodeChanges = (node) => {
    if (!comparisonNodes.length) return 'unchanged';
    
    const otherNode = comparisonNodes.find(n => n.id === node.id);
    if (!otherNode) {
      return isBase ? 'removed' : 'added';
    }
    
    // Check if node data has changed
    if (JSON.stringify(node.data) !== JSON.stringify(otherNode.data)) {
      return 'modified';
    }
    
    return 'unchanged';
  };

  return (
    <div className="graph-preview-container">
      <div className="nodes-list">
        {nodes.map((node) => {
          const changeType = getNodeChanges(node);
          return (
            <div 
              key={node.id} 
              className={`node-item ${node.type} ${changeType}`}
              title={`${node.data.label} (${changeType})`}
            >
              <div className="node-icon">
                {node.type === 'start' && '🟢'}
                {node.type === 'end' && '🔴'}
                {node.type === 'menu' && '📋'}
                {node.type === 'input' && '📝'}
                {node.type === 'action' && '⚙️'}
              </div>
              <div className="node-info">
                <div className="node-label">{node.data.label}</div>
                <div className="node-type">{node.type}</div>
              </div>
              <div className="change-indicator">
                {changeType === 'added' && '➕'}
                {changeType === 'removed' && '➖'}
                {changeType === 'modified' && '✏️'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Changes Summary Component
const ChangesSummary = ({ oldNodes, newNodes, oldEdges, newEdges }) => {
  const calculateChanges = () => {
    const changes = {
      nodesAdded: [],
      nodesRemoved: [],
      nodesModified: [],
      edgesAdded: newEdges.length - oldEdges.length,
      totalChanges: 0
    };

    // Find node changes
    newNodes.forEach(newNode => {
      const oldNode = oldNodes.find(n => n.id === newNode.id);
      if (!oldNode) {
        changes.nodesAdded.push(newNode);
      } else if (JSON.stringify(newNode.data) !== JSON.stringify(oldNode.data)) {
        changes.nodesModified.push(newNode);
      }
    });

    oldNodes.forEach(oldNode => {
      const newNode = newNodes.find(n => n.id === oldNode.id);
      if (!newNode) {
        changes.nodesRemoved.push(oldNode);
      }
    });

    changes.totalChanges = changes.nodesAdded.length + 
                          changes.nodesRemoved.length + 
                          changes.nodesModified.length + 
                          Math.abs(changes.edgesAdded);

    return changes;
  };

  const changes = calculateChanges();

  return (
    <div className="changes-summary-content">
      <div className="change-stats">
        <div className="stat-item added">
          <span className="stat-number">{changes.nodesAdded.length}</span>
          <span className="stat-label">Added</span>
        </div>
        <div className="stat-item modified">
          <span className="stat-number">{changes.nodesModified.length}</span>
          <span className="stat-label">Modified</span>
        </div>
        <div className="stat-item removed">
          <span className="stat-number">{changes.nodesRemoved.length}</span>
          <span className="stat-label">Removed</span>
        </div>
        <div className="stat-item total">
          <span className="stat-number">{changes.totalChanges}</span>
          <span className="stat-label">Total Changes</span>
        </div>
      </div>

      {changes.totalChanges > 0 && (
        <div className="change-details">
          {changes.nodesAdded.length > 0 && (
            <div className="change-group added">
              <h5>➕ Added Nodes ({changes.nodesAdded.length})</h5>
              <div className="change-list">
                {changes.nodesAdded.map(node => (
                  <span key={node.id} className="change-item">
                    {node.data.label} ({node.type})
                  </span>
                ))}
              </div>
            </div>
          )}

          {changes.nodesModified.length > 0 && (
            <div className="change-group modified">
              <h5>✏️ Modified Nodes ({changes.nodesModified.length})</h5>
              <div className="change-list">
                {changes.nodesModified.map(node => (
                  <span key={node.id} className="change-item">
                    {node.data.label} ({node.type})
                  </span>
                ))}
              </div>
            </div>
          )}

          {changes.nodesRemoved.length > 0 && (
            <div className="change-group removed">
              <h5>➖ Removed Nodes ({changes.nodesRemoved.length})</h5>
              <div className="change-list">
                {changes.nodesRemoved.map(node => (
                  <span key={node.id} className="change-item">
                    {node.data.label} ({node.type})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {changes.totalChanges === 0 && (
        <div className="no-changes">
          ✨ No changes detected in this version
        </div>
      )}
    </div>
  );
};

export default MakerCheckerWorkflow;
