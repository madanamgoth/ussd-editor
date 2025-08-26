import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './components/NodeTypes';
import NodePalette from './components/NodePalette';
import FlowControls from './components/FlowControls';
import NodeConfigPanel from './components/NodeConfigPanel';
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
  
  // Initialize with auto-save data
  const initializeFromStorage = () => {
    const savedData = localStorage.getItem('ussd-editor-autosave');
    if (savedData) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedData);
        return {
          nodes: savedNodes || [],
          edges: savedEdges || []
        };
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    return { nodes: [], edges: [] };
  };

  const { nodes: initialNodes, edges: initialEdges } = initializeFromStorage();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const { screenToFlowPosition } = useReactFlow();

  // Handle edge deletion
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

      // Remove the edges from the edges state
      setEdges((eds) => 
        eds.filter((edge) => 
          !edgesToDelete.some((deletedEdge) => deletedEdge.id === edge.id)
        )
      );
    },
    [setNodes, setEdges]
  );

  // Auto-save functionality
  useEffect(() => {
    const flowData = {
      nodes,
      edges,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('ussd-editor-autosave', JSON.stringify(flowData));
    console.log('Auto-saved at:', flowData.timestamp);
  }, [nodes, edges]);

  // Keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if user is typing in an input field, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Only handle delete/backspace if not typing in an input field
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isInputFocused) {
        // Find selected nodes and edges
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);
        
        // Delete selected nodes
        if (selectedNodes.length > 0) {
          setNodes((nds) => nds.filter((node) => !node.selected));
        }
        
        // Delete selected edges
        if (selectedEdges.length > 0) {
          onEdgeDelete(selectedEdges);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, edges, onEdgeDelete, setNodes]);

  // Default edge options with arrow markers
  const defaultEdgeOptions = {
    animated: true,
    style: {
      strokeWidth: 3,
      stroke: '#6366f1',
      cursor: 'pointer',
    },
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#6366f1',
    },
    focusable: true,
    selectable: true,
    deletable: true,
    interactionWidth: 20, // Makes edges easier to click
  };

  // Update node data function
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  // Handle node selection (single click)
  const onNodeClick = useCallback((event, node) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      }))
    );
  }, [setNodes]);

  // Handle node double-click for editing
  const onNodeDoubleClick = useCallback((event, node) => {
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      }))
    );
  }, [setNodes]);

  // Handle canvas click to deselect nodes and edges
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: false
      }))
    );
  }, [setNodes, setEdges]);

  // Handle edge click to select edges
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === edge.id
      }))
    );
    // Deselect nodes when selecting an edge
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false
      }))
    );
    setSelectedNode(null);
  }, [setEdges, setNodes]);

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

      // Create edge with meaningful label
      let edgeLabel = '➡️ Next';
      if (params.sourceHandle) {
        if (params.sourceHandle.startsWith('transaction-')) {
          const code = params.sourceHandle.replace('transaction-', '');
          edgeLabel = `${code === '200' ? '✅' : code === '400' ? '⚠️' : '❌'} ${code}`;
        } else if (params.sourceHandle.startsWith('option-')) {
          const option = params.sourceHandle.replace('option-', '');
          edgeLabel = `📋 Option ${option}`;
        } else if (params.sourceHandle === 'fallback') {
          edgeLabel = '🔄 Fallback';
        } else if (params.sourceHandle === 'input') {
          edgeLabel = '📝 Input';
        } else {
          edgeLabel = params.sourceHandle;
        }
      }

      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        label: edgeLabel,
        labelStyle: {
          fill: '#6366f1',
          fontWeight: 600,
          fontSize: '12px',
        },
        labelBgStyle: {
          fill: 'white',
          fillOpacity: 0.9,
          stroke: '#6366f1',
          strokeWidth: 1,
        },
        labelBgPadding: [4, 8],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6366f1',
        },
        style: {
          strokeWidth: 2,
          stroke: '#6366f1',
        }
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setNodes, setEdges]
  );

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

  const handleImport = useCallback((importData, importType = 'flow') => {
    if (importType === 'graph') {
      // Graph format - direct import of nodes and edges
      const nodesWithUpdate = importData.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          updateNodeData: updateNodeData
        }
      }));
      
      setNodes(nodesWithUpdate);
      setEdges(importData.edges || []);
    } else {
      // Flow format - convert from simplified format
      const importedNodes = importFromFlowFormat(importData);
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
    }
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
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            selectNodesOnDrag={false}
            edgesFocusable={true}
            edgesReconnectable={false}
            elementsSelectable={true}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
      
      {/* Configuration Panel - Shows on double-click */}
      {selectedNode && (
        <div className="config-sidebar">
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdateNode={updateNodeData}
            onClose={() => setSelectedNode(null)}
            allNodes={nodes}
          />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <ReactFlowProvider>
    <DnDFlow />
  </ReactFlowProvider>
);

export default App;
