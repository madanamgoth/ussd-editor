import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './components/NodeTypes';
import NodePalette from './components/NodePalette';
import FlowControls from './components/FlowControls';
import { 
  createNodeData, 
  createEdge, 
  importFromFlowFormat, 
  generateEdgesFromNodes,
  autoLayout
} from './utils/flowUtils';
import './styles/editor.css';

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const { screenToFlowPosition } = useReactFlow();

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node.id);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      }))
    );
  }, [setNodes]);

  // Handle node double-click for editing
  const onNodeDoubleClick = useCallback((event, node) => {
    // The editing will be handled within each node component
    console.log('Double-clicked node:', node.id);
  }, []);

  // Handle canvas click to deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false
      }))
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (params) => {
      // Update the source node's transitions
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === params.source) {
            const newTransitions = { ...node.data.config.transitions };
            const key = params.sourceHandle || '';
            newTransitions[key] = params.target;
            
            return {
              ...node,
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  transitions: newTransitions
                }
              }
            };
          }
          return node;
        })
      );

      setEdges((eds) => addEdge(params, eds));
    },
    [setNodes, setEdges]
  );

  // Enhanced node data update function
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNodeData(type, position);
      newNode.data.updateNodeData = updateNodeData; // Pass update function to node
      
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, updateNodeData]
  );

  const onEdgeDelete = useCallback(
    (edgesToDelete) => {
      // Update source node transitions when edge is deleted
      edgesToDelete.forEach((edge) => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === edge.source) {
              const newTransitions = { ...node.data.config.transitions };
              const key = edge.sourceHandle || '';
              if (newTransitions[key] === edge.target) {
                newTransitions[key] = '';
              }
              
              return {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...node.data.config,
                    transitions: newTransitions
                  }
                }
              };
            }
            return node;
          })
        );
      });
    },
    [setNodes]
  );

  const handleImport = useCallback((flowData) => {
    const importedNodes = importFromFlowFormat(flowData);
    const importedEdges = generateEdgesFromNodes(importedNodes);
    
    // Add update function to imported nodes
    const nodesWithUpdate = importedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        updateNodeData: updateNodeData
      }
    }));
    
    setNodes(nodesWithUpdate);
    setEdges(importedEdges);
  }, [setNodes, setEdges, updateNodeData]);

  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all nodes and edges?')) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = autoLayout(nodes, edges);
    setNodes(layoutedNodes);
  }, [nodes, edges, setNodes]);

  return (
    <div className="ussd-editor">
      <div className="sidebar">
        <NodePalette />
        <FlowControls 
          nodes={nodes}
          edges={edges}
          onImport={handleImport}
          onClear={handleClear}
          onAutoLayout={handleAutoLayout}
        />
      </div>
      
      <div className="canvas-container">
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onEdgesDelete={onEdgeDelete}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            selectNodesOnDrag={false}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <ReactFlowProvider>
    <DnDFlow />
  </ReactFlowProvider>
);

export default App;
