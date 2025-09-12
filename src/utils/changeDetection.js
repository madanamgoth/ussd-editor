// Graph Change Detection Utility
// Analyzes differences between original and edited graphs

export const detectGraphChanges = (originalGraph, editedGraph) => {
  const changes = {
    nodes: {
      added: [],
      removed: [],
      modified: []
    },
    edges: {
      added: [],
      removed: [],
      modified: []
    },
    summary: {
      totalChanges: 0,
      nodeChanges: 0,
      edgeChanges: 0
    }
  };

  const originalNodes = originalGraph?.nodes || [];
  const editedNodes = editedGraph?.nodes || [];
  const originalEdges = originalGraph?.edges || [];
  const editedEdges = editedGraph?.edges || [];

  // Detect node changes
  detectNodeChanges(originalNodes, editedNodes, changes);
  
  // Detect edge changes
  detectEdgeChanges(originalEdges, editedEdges, changes);

  // Calculate summary
  changes.summary.nodeChanges = changes.nodes.added.length + changes.nodes.removed.length + changes.nodes.modified.length;
  changes.summary.edgeChanges = changes.edges.added.length + changes.edges.removed.length + changes.edges.modified.length;
  changes.summary.totalChanges = changes.summary.nodeChanges + changes.summary.edgeChanges;

  return changes;
};

const detectNodeChanges = (originalNodes, editedNodes, changes) => {
  // Create maps for faster lookup
  const originalNodeMap = new Map(originalNodes.map(node => [node.id, node]));
  const editedNodeMap = new Map(editedNodes.map(node => [node.id, node]));

  // Find added nodes (exist in edited but not in original)
  editedNodes.forEach(editedNode => {
    if (!originalNodeMap.has(editedNode.id)) {
      changes.nodes.added.push({
        node: editedNode,
        changeType: 'added',
        details: {
          type: editedNode.type,
          position: editedNode.position,
          data: editedNode.data
        }
      });
    }
  });

  // Find removed nodes (exist in original but not in edited)
  originalNodes.forEach(originalNode => {
    if (!editedNodeMap.has(originalNode.id)) {
      changes.nodes.removed.push({
        node: originalNode,
        changeType: 'removed',
        details: {
          type: originalNode.type,
          position: originalNode.position,
          data: originalNode.data
        }
      });
    }
  });

  // Find modified nodes (exist in both but with differences)
  originalNodes.forEach(originalNode => {
    const editedNode = editedNodeMap.get(originalNode.id);
    if (editedNode) {
      const nodeChanges = detectNodePropertyChanges(originalNode, editedNode);
      if (nodeChanges.length > 0) {
        changes.nodes.modified.push({
          originalNode,
          editedNode,
          changeType: 'modified',
          changes: nodeChanges
        });
      }
    }
  });
};

const detectNodePropertyChanges = (originalNode, editedNode) => {
  const changes = [];

  // Check position changes
  if (originalNode.position.x !== editedNode.position.x || originalNode.position.y !== editedNode.position.y) {
    changes.push({
      property: 'position',
      oldValue: originalNode.position,
      newValue: editedNode.position,
      description: `Moved from (${originalNode.position.x}, ${originalNode.position.y}) to (${editedNode.position.x}, ${editedNode.position.y})`
    });
  }

  // Check type changes
  if (originalNode.type !== editedNode.type) {
    changes.push({
      property: 'type',
      oldValue: originalNode.type,
      newValue: editedNode.type,
      description: `Node type changed from "${originalNode.type}" to "${editedNode.type}"`
    });
  }

  // Check data changes (configuration)
  const dataChanges = detectDataChanges(originalNode.data, editedNode.data);
  changes.push(...dataChanges);

  return changes;
};

const detectDataChanges = (originalData, editedData) => {
  const changes = [];
  const allKeys = new Set([...Object.keys(originalData || {}), ...Object.keys(editedData || {})]);

  allKeys.forEach(key => {
    const oldValue = originalData?.[key];
    const newValue = editedData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        property: `data.${key}`,
        oldValue,
        newValue,
        description: getDataChangeDescription(key, oldValue, newValue)
      });
    }
  });

  return changes;
};

const getDataChangeDescription = (key, oldValue, newValue) => {
  if (oldValue === undefined) {
    return `Added ${key}: "${newValue}"`;
  }
  if (newValue === undefined) {
    return `Removed ${key}: "${oldValue}"`;
  }
  
  switch (key) {
    case 'label':
      return `Label changed from "${oldValue}" to "${newValue}"`;
    case 'text':
      return `Text changed from "${oldValue}" to "${newValue}"`;
    case 'options':
      return `Menu options changed`;
    case 'variable':
      return `Variable changed from "${oldValue}" to "${newValue}"`;
    case 'validation':
      return `Validation rules changed`;
    case 'action':
      return `Action changed from "${oldValue}" to "${newValue}"`;
    default:
      return `${key} changed from "${oldValue}" to "${newValue}"`;
  }
};

const detectEdgeChanges = (originalEdges, editedEdges, changes) => {
  const originalEdgeMap = new Map(originalEdges.map(edge => [edge.id, edge]));
  const editedEdgeMap = new Map(editedEdges.map(edge => [edge.id, edge]));

  // Find added edges
  editedEdges.forEach(editedEdge => {
    if (!originalEdgeMap.has(editedEdge.id)) {
      changes.edges.added.push({
        edge: editedEdge,
        changeType: 'added',
        details: {
          source: editedEdge.source,
          target: editedEdge.target,
          label: editedEdge.label
        }
      });
    }
  });

  // Find removed edges
  originalEdges.forEach(originalEdge => {
    if (!editedEdgeMap.has(originalEdge.id)) {
      changes.edges.removed.push({
        edge: originalEdge,
        changeType: 'removed',
        details: {
          source: originalEdge.source,
          target: originalEdge.target,
          label: originalEdge.label
        }
      });
    }
  });

  // Find modified edges
  originalEdges.forEach(originalEdge => {
    const editedEdge = editedEdgeMap.get(originalEdge.id);
    if (editedEdge) {
      const edgeChanges = detectEdgePropertyChanges(originalEdge, editedEdge);
      if (edgeChanges.length > 0) {
        changes.edges.modified.push({
          originalEdge,
          editedEdge,
          changeType: 'modified',
          changes: edgeChanges
        });
      }
    }
  });
};

const detectEdgePropertyChanges = (originalEdge, editedEdge) => {
  const changes = [];

  if (originalEdge.source !== editedEdge.source || originalEdge.target !== editedEdge.target) {
    changes.push({
      property: 'connection',
      oldValue: { source: originalEdge.source, target: originalEdge.target },
      newValue: { source: editedEdge.source, target: editedEdge.target },
      description: `Connection changed from ${originalEdge.source}→${originalEdge.target} to ${editedEdge.source}→${editedEdge.target}`
    });
  }

  if (originalEdge.label !== editedEdge.label) {
    changes.push({
      property: 'label',
      oldValue: originalEdge.label,
      newValue: editedEdge.label,
      description: `Edge label changed from "${originalEdge.label}" to "${editedEdge.label}"`
    });
  }

  return changes;
};

export const getChangeColor = (changeType) => {
  switch (changeType) {
    case 'added':
      return '#28a745'; // Green
    case 'removed':
      return '#dc3545'; // Red
    case 'modified':
      return '#ffc107'; // Yellow
    default:
      return '#6c757d'; // Gray
  }
};

export const getChangeIcon = (changeType) => {
  switch (changeType) {
    case 'added':
      return '➕';
    case 'removed':
      return '➖';
    case 'modified':
      return '✏️';
    default:
      return '❓';
  }
};
