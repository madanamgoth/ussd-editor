import React, { useRef, useEffect, useState } from 'react';
import IsolatedReactFlow from './IsolatedReactFlow';
import ChangeDetailsPanel from './ChangeDetailsPanel';
import { detectGraphChanges, getChangeColor } from '../utils/changeDetection';
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
  // Simple debug logging - show exactly what we received
  console.log('🔄 DualCanvasComparison - Raw Data Display:', {
    originalGraph: originalGraph ? {
      name: originalGraph.metadata?.name,
      nodes: originalGraph.nodes?.length,
      edges: originalGraph.edges?.length,
      nodeTypes: originalGraph.nodes?.map(n => `${n.type}:${n.id}`),
      rawNodes: originalGraph.nodes
    } : 'NO ORIGINAL',
    editedGraph: editedGraph ? {
      name: editedGraph.metadata?.name,
      nodes: editedGraph.nodes?.length,
      edges: editedGraph.edges?.length,
      nodeTypes: editedGraph.nodes?.map(n => `${n.type}:${n.id}`),
      rawNodes: editedGraph.nodes
    } : 'NO EDITED'
  });

  const [showChangePanel, setShowChangePanel] = useState(false); // Disabled by default
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [changes, setChanges] = useState(null);

  // Handle node clicks
  const handleNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
    setShowChangePanel(true);
  };

  // Enhanced node styling with change detection
  const getNodeStyle = (node, isOriginal) => {
    const baseStyle = node.style || {};
    
    if (!changes) return baseStyle;

    let changeType = null;
    let isSelected = selectedNodeId === node.id;
    
    if (isOriginal) {
      // Check if this node was removed
      const removedNode = changes.nodes.removed.find(change => change.node.id === node.id);
      if (removedNode) {
        changeType = 'removed';
      } else {
        // Check if this node was modified
        const modifiedNode = changes.nodes.modified.find(change => change.originalNode.id === node.id);
        if (modifiedNode) {
          changeType = 'modified';
        }
      }
    } else {
      // Check if this node was added
      const addedNode = changes.nodes.added.find(change => change.node.id === node.id);
      if (addedNode) {
        changeType = 'added';
      } else {
        // Check if this node was modified
        const modifiedNode = changes.nodes.modified.find(change => change.editedNode.id === node.id);
        if (modifiedNode) {
          changeType = 'modified';
        }
      }
    }
    
    let borderColor = '#333';
    let backgroundColor = 'transparent';
    let borderWidth = 1;
    
    if (changeType) {
      borderColor = getChangeColor(changeType);
      backgroundColor = `${getChangeColor(changeType)}15`; // 15 = low opacity
      borderWidth = 2;
    }
    
    if (isSelected) {
      borderColor = '#007bff';
      backgroundColor = '#007bff20';
      borderWidth = 3;
    }

    return {
      ...baseStyle,
      border: `${borderWidth}px solid ${borderColor}`,
      backgroundColor,
      boxShadow: isSelected ? '0 0 0 2px rgba(0, 123, 255, 0.3)' : changeType ? `0 2px 8px ${getChangeColor(changeType)}40` : undefined
    };
  };

  // Apply styling to nodes - removed since IsolatedReactFlow handles this
  
  return (
    <div className={`dual-canvas-comparison ${comparisonMode}`}>
      <div className="comparison-header">
        <div className="header-section">
          <h3>📋 Original v{originalGraph?.metadata?.version || '1.0.0'}</h3>
          <span className="graph-stat">{originalGraph?.nodes?.length || 0} nodes, {originalGraph?.edges?.length || 0} edges</span>
        </div>
        
        <div className="comparison-controls-inline">
          <div className="review-title">
            🔍 Reviewing: {graphName}
            {changes && (
              <span className="change-summary"> ({changes.summary.totalChanges} changes)</span>
            )}
          </div>
          
          <div className="all-controls">
            <button 
              className={`mode-btn-compact ${comparisonMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => onModeChange('side-by-side')}
            >
              ⬌ Side by Side
            </button>
            <button 
              className={`mode-btn-compact ${comparisonMode === 'top-bottom' ? 'active' : ''}`}
              onClick={() => onModeChange('top-bottom')}
            >
              ⬍ Top/Bottom
            </button>
            <button 
              className={`mode-btn-compact ${showChangePanel ? 'active' : ''}`}
              onClick={() => setShowChangePanel(!showChangePanel)}
            >
              📋 Details
            </button>
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

      <div className="comparison-legend">
        <div className="legend-item">
          <div className="legend-color added"></div>
          <span>Added</span>
        </div>
        <div className="legend-item">
          <div className="legend-color modified"></div>
          <span>Modified</span>
        </div>
        <div className="legend-item">
          <div className="legend-color removed"></div>
          <span>Removed</span>
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

      {/* Change Details Panel */}
      {showChangePanel && changes && (
        <ChangeDetailsPanel
          changes={changes}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          onClose={() => setShowChangePanel(false)}
        />
      )}
    </div>
  );
};

export default DualCanvasComparison;
