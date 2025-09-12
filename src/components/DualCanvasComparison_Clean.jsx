import React, { useState } from 'react';
import IsolatedReactFlow from './IsolatedReactFlow';
import './DualCanvasComparison.css';

const DualCanvasComparison = ({ 
  originalGraph, 
  editedGraph, 
  comparisonMode = 'side-by-side',
  onModeChange,
  onApprove,
  onReject,
  graphName
}) => {
  console.log('🔄 DualCanvasComparison - Clean Version:', {
    originalGraph: originalGraph ? {
      name: originalGraph.metadata?.name,
      nodes: originalGraph.nodes?.length,
      edges: originalGraph.edges?.length,
      nodeIds: originalGraph.nodes?.map(n => `${n.type}:${n.id}`)
    } : 'NO ORIGINAL',
    editedGraph: editedGraph ? {
      name: editedGraph.metadata?.name,
      nodes: editedGraph.nodes?.length,
      edges: editedGraph.edges?.length,
      nodeIds: editedGraph.nodes?.map(n => `${n.type}:${n.id}`)
    } : 'NO EDITED'
  });

  // Add debugging alerts to see what's happening
  if (originalGraph && editedGraph) {
    console.log('🚨 CRITICAL DEBUG - Data check:');
    console.log('Original nodes:', originalGraph.nodes?.length);
    console.log('Edited nodes:', editedGraph.nodes?.length);
    console.log('Are they equal?', originalGraph.nodes?.length === editedGraph.nodes?.length);
    console.log('Original first node:', originalGraph.nodes?.[0]?.id);
    console.log('Edited first node:', editedGraph.nodes?.[0]?.id);
    console.log('Original last node:', originalGraph.nodes?.[originalGraph.nodes?.length - 1]?.id);
    console.log('Edited last node:', editedGraph.nodes?.[editedGraph.nodes?.length - 1]?.id);
  }

  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const handleNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
  };

  return (
    <div className={`dual-canvas-comparison ${comparisonMode}`}>
      <div className="comparison-header">
        <div className="header-section">
          <h3>📋 Original v{originalGraph?.metadata?.version || '1.0.0'}</h3>
          <span className="graph-stat">{originalGraph?.nodes?.length || 0} nodes, {originalGraph?.edges?.length || 0} edges</span>
        </div>
        
        <div className="comparison-controls-inline">
          <div className="review-title">
            🔍 Reviewing: {graphName || editedGraph?.metadata?.name || 'Unknown'}
          </div>
          
          <div className="all-controls">
            <button 
              className="review-btn-compact reject-btn"
              onClick={onReject}
            >
              ❌ Reject
            </button>
            <button 
              className="review-btn-compact approve-btn"
              onClick={onApprove}
            >
              ✅ Approve
            </button>
          </div>
        </div>
        
        <div className="header-section">
          <h3>✏️ Edited v{editedGraph?.metadata?.version || '1.1.0'}</h3>
          <span className="graph-stat">{editedGraph?.nodes?.length || 0} nodes, {editedGraph?.edges?.length || 0} edges</span>
        </div>
      </div>

      <div className="canvas-container">
        {/* 🔍 DEBUG: Check exact data being passed */}
        {console.log('🔍 ORIGINAL DATA BEING PASSED:', {
          hasOriginalGraph: !!originalGraph,
          originalNodes: originalGraph?.nodes?.length,
          originalNodeIds: originalGraph?.nodes?.map(n => `${n.type}:${n.id}`),
          originalVersion: originalGraph?.metadata?.version
        })}
        
        {console.log('🔍 EDITED DATA BEING PASSED:', {
          hasEditedGraph: !!editedGraph,
          editedNodes: editedGraph?.nodes?.length,
          editedNodeIds: editedGraph?.nodes?.map(n => `${n.type}:${n.id}`),
          editedVersion: editedGraph?.metadata?.version
        })}
        
        <IsolatedReactFlow
          nodes={originalGraph?.nodes || []}
          edges={originalGraph?.edges || []}
          title="Original Graph"
          isSelectable={false}
          canvasId="original"
        />
        
        <IsolatedReactFlow
          nodes={editedGraph?.nodes || []}
          edges={editedGraph?.edges || []}
          title="Edited Graph"
          isSelectable={true}
          onNodeClick={handleNodeClick}
          canvasId="edited"
        />
      </div>
    </div>
  );
};

export default DualCanvasComparison;
