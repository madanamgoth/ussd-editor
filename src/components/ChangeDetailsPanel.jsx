import React, { useState } from 'react';
import { getChangeColor, getChangeIcon } from '../utils/changeDetection';
import './ChangeDetailsPanel.css';

const ChangeDetailsPanel = ({ 
  changes, 
  selectedNodeId = null, 
  onNodeSelect,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpand = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderSummary = () => (
    <div className="change-summary">
      <div className="summary-stats">
        <div className="stat-item">
          <span className="stat-number">{changes.summary.totalChanges}</span>
          <span className="stat-label">Total Changes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{changes.summary.nodeChanges}</span>
          <span className="stat-label">Node Changes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{changes.summary.edgeChanges}</span>
          <span className="stat-label">Edge Changes</span>
        </div>
      </div>

      <div className="change-categories">
        <div className="category-item">
          <div className="category-header" style={{ color: getChangeColor('added') }}>
            {getChangeIcon('added')} Added
          </div>
          <div className="category-details">
            <span>{changes.nodes.added.length} nodes, {changes.edges.added.length} edges</span>
          </div>
        </div>
        
        <div className="category-item">
          <div className="category-header" style={{ color: getChangeColor('modified') }}>
            {getChangeIcon('modified')} Modified
          </div>
          <div className="category-details">
            <span>{changes.nodes.modified.length} nodes, {changes.edges.modified.length} edges</span>
          </div>
        </div>
        
        <div className="category-item">
          <div className="category-header" style={{ color: getChangeColor('removed') }}>
            {getChangeIcon('removed')} Removed
          </div>
          <div className="category-details">
            <span>{changes.nodes.removed.length} nodes, {changes.edges.removed.length} edges</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNodeChanges = () => (
    <div className="node-changes">
      {['added', 'modified', 'removed'].map(changeType => {
        const nodeChanges = changes.nodes[changeType];
        if (nodeChanges.length === 0) return null;

        return (
          <div key={changeType} className="change-group">
            <h4 style={{ color: getChangeColor(changeType) }}>
              {getChangeIcon(changeType)} {changeType.charAt(0).toUpperCase() + changeType.slice(1)} Nodes ({nodeChanges.length})
            </h4>
            
            {nodeChanges.map((change, index) => {
              const nodeId = change.node?.id || change.originalNode?.id;
              const node = change.node || change.editedNode;
              const isExpanded = expandedItems.has(`node-${nodeId}`);
              const isSelected = selectedNodeId === nodeId;

              return (
                <div 
                  key={`${changeType}-${nodeId}-${index}`}
                  className={`change-item ${isSelected ? 'selected' : ''}`}
                >
                  <div 
                    className="change-header"
                    onClick={() => {
                      toggleExpand(`node-${nodeId}`);
                      onNodeSelect?.(nodeId);
                    }}
                  >
                    <span className="node-info">
                      <strong>{node?.data?.label || node?.type || 'Unknown Node'}</strong>
                      <span className="node-type">({node?.type})</span>
                    </span>
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  </div>

                  {isExpanded && (
                    <div className="change-details">
                      {changeType === 'modified' && change.changes ? (
                        <div className="modifications">
                          {change.changes.map((modification, modIndex) => (
                            <div key={modIndex} className="modification-item">
                              <div className="modification-title">{modification.property}</div>
                              <div className="modification-desc">{modification.description}</div>
                              {modification.oldValue !== undefined && modification.newValue !== undefined && (
                                <div className="value-comparison">
                                  <div className="old-value">
                                    <span className="label">Before:</span>
                                    <span className="value">{JSON.stringify(modification.oldValue)}</span>
                                  </div>
                                  <div className="new-value">
                                    <span className="label">After:</span>
                                    <span className="value">{JSON.stringify(modification.newValue)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="node-details">
                          <div className="detail-item">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{node?.type}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Position:</span>
                            <span className="detail-value">({node?.position?.x}, {node?.position?.y})</span>
                          </div>
                          {node?.data && Object.keys(node.data).map(key => (
                            <div key={key} className="detail-item">
                              <span className="detail-label">{key}:</span>
                              <span className="detail-value">{JSON.stringify(node.data[key])}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const renderEdgeChanges = () => (
    <div className="edge-changes">
      {['added', 'modified', 'removed'].map(changeType => {
        const edgeChanges = changes.edges[changeType];
        if (edgeChanges.length === 0) return null;

        return (
          <div key={changeType} className="change-group">
            <h4 style={{ color: getChangeColor(changeType) }}>
              {getChangeIcon(changeType)} {changeType.charAt(0).toUpperCase() + changeType.slice(1)} Edges ({edgeChanges.length})
            </h4>
            
            {edgeChanges.map((change, index) => {
              const edge = change.edge || change.editedEdge;
              const edgeId = edge?.id || `${changeType}-${index}`;
              const isExpanded = expandedItems.has(`edge-${edgeId}`);

              return (
                <div key={`${changeType}-${edgeId}`} className="change-item">
                  <div 
                    className="change-header"
                    onClick={() => toggleExpand(`edge-${edgeId}`)}
                  >
                    <span className="edge-info">
                      <strong>{edge?.source} → {edge?.target}</strong>
                      {edge?.label && <span className="edge-label">"{edge.label}"</span>}
                    </span>
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  </div>

                  {isExpanded && (
                    <div className="change-details">
                      {changeType === 'modified' && change.changes ? (
                        <div className="modifications">
                          {change.changes.map((modification, modIndex) => (
                            <div key={modIndex} className="modification-item">
                              <div className="modification-desc">{modification.description}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="edge-details">
                          <div className="detail-item">
                            <span className="detail-label">Source:</span>
                            <span className="detail-value">{edge?.source}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Target:</span>
                            <span className="detail-value">{edge?.target}</span>
                          </div>
                          {edge?.label && (
                            <div className="detail-item">
                              <span className="detail-label">Label:</span>
                              <span className="detail-value">"{edge.label}"</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="change-details-panel">
      <div className="panel-header">
        <h3>📋 Change Details</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-tabs">
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Summary
        </button>
        <button 
          className={`tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          🔷 Nodes
        </button>
        <button 
          className={`tab ${activeTab === 'edges' ? 'active' : ''}`}
          onClick={() => setActiveTab('edges')}
        >
          🔗 Edges
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'nodes' && renderNodeChanges()}
        {activeTab === 'edges' && renderEdgeChanges()}
      </div>
    </div>
  );
};

export default ChangeDetailsPanel;
