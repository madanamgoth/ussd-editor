import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import { nodeTypes } from './NodeTypes';
import CustomEdge from './CustomEdge';

const edgeTypes = {
  custom: CustomEdge,
};

const IsolatedReactFlow = ({ 
  nodes = [], 
  edges = [], 
  onNodeClick,
  title,
  isSelectable = false,
  canvasId = 'default'
}) => {
  console.log(`🔍 [${canvasId}] IsolatedReactFlow received:`, {
    title,
    nodeCount: nodes.length,
    nodeIds: nodes.map(n => `${n.type}:${n.id}`),
    edgeCount: edges.length,
    isSelectable,
    rawNodes: nodes
  });

  // ✅ Create completely unique keys for each node and edge to prevent sharing
  const uniqueNodes = React.useMemo(() => {
    return nodes.map(node => ({
      ...node,
      id: `${canvasId}_${node.id}`, // Prefix with canvas ID to make unique
      data: {
        ...node.data,
        originalId: node.id, // Keep original ID for reference
        canvasId: canvasId
      }
    }));
  }, [nodes, canvasId]);

  const uniqueEdges = React.useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      id: `${canvasId}_${edge.id}`,
      source: `${canvasId}_${edge.source}`,
      target: `${canvasId}_${edge.target}`
    }));
  }, [edges, canvasId]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(uniqueNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(uniqueEdges);

  // Update when props change
  React.useEffect(() => {
    console.log(`🔄 [${canvasId}] Updating with unique nodes:`, uniqueNodes.length, 'nodes');
    console.log(`📋 [${canvasId}] Unique Node IDs:`, uniqueNodes.map(n => n.id));
    setFlowNodes(uniqueNodes);
  }, [uniqueNodes, setFlowNodes, canvasId]);

  React.useEffect(() => {
    console.log(`🔄 [${canvasId}] Updating with unique edges:`, uniqueEdges.length, 'edges');
    setFlowEdges(uniqueEdges);
  }, [uniqueEdges, setFlowEdges, canvasId]);

  React.useEffect(() => {
    console.log(`🔍 [${canvasId}] React Flow State:`, {
      stateNodes: flowNodes.length,
      nodeIds: flowNodes.map(n => n.id)
    });
  }, [flowNodes, canvasId]);

  const handleNodeClickWrapper = (event, node) => {
    console.log(`🔷 [${canvasId}] Node clicked:`, node.id, 'Original:', node.data.originalId);
    if (onNodeClick && node.data.originalId) {
      // Pass back the original node ID
      onNodeClick(event, { ...node, id: node.data.originalId });
    }
  };

  return (
    <div className="canvas-section" id={`canvas-${canvasId}`}>
      <div className="canvas-title">{title} ({flowNodes.length} nodes, {flowEdges.length} edges)</div>
      <ReactFlow
        key={`isolated-${canvasId}-${Date.now()}`}
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClickWrapper}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={isSelectable}
        panOnDrag={true}
        zoomOnScroll={true}
        preventScrolling={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        id={`reactflow-${canvasId}`}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default IsolatedReactFlow;
