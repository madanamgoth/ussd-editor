import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './components/NodeTypes';
import NodePalette from './components/NodePalette';
import NodeConfigPanel from './components/NodeConfigPanel';
import { createNodeData } from './utils/flowUtils';
import './styles/editor.css';

const SimpleFlow = () => {
  // Initialize with saved data immediately
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
  const [selectedNode, setSelectedNode] = useState(null);
  const { screenToFlowPosition } = useReactFlow();

  // Auto-save to localStorage whenever nodes or edges change
  useEffect(() => {
    // Only auto-save if there are nodes or edges to save
    if (nodes.length > 0 || edges.length > 0) {
      const flowData = {
        nodes,
        edges,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('ussd-editor-autosave', JSON.stringify(flowData));
      console.log('Auto-saved to localStorage:', flowData.timestamp);
    }
  }, [nodes, edges]);

  // Default edge options
  const defaultEdgeOptions = {
    animated: true,
    style: {
      strokeWidth: 2,
      stroke: '#6366f1',
    },
    type: 'smoothstep',
    markerEnd: {
      type: 'arrowclosed',
      width: 20,
      height: 20,
      color: '#6366f1',
    },
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      console.log('Dropped node type:', type);

      if (typeof type === 'undefined' || !type) {
        console.log('No type data found');
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      console.log('Drop position:', position);

      const newNode = createNodeData(type, position);
      console.log('Created node:', newNode);
      
      setNodes((nds) => {
        console.log('Adding node to existing nodes:', nds);
        return nds.concat(newNode);
      });
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((event, node) => {
    console.log('Node clicked:', node.id);
    // Only select the node, don't open config panel
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      }))
    );
  }, [setNodes]);

  const onNodeDoubleClick = useCallback((event, node) => {
    console.log('Node double-clicked:', node.id);
    // Open configuration panel on double click
    setSelectedNode(node);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      }))
    );
  }, [setNodes]);

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
      console.log('Connection created:', params);
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onEdgeClick = useCallback((event, edge) => {
    console.log('Edge clicked:', edge.id);
  }, []);

  // Handle keyboard shortcuts for deletion
  const onKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Delete selected nodes
      setNodes((nds) => nds.filter((node) => !node.selected));
      // Delete selected edges  
      setEdges((eds) => eds.filter((edge) => !edge.selected));
    }
  }, [setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...newData
            }
          };
          // Update selected node if it's the same
          if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }
        return node;
      })
    );
  }, [setNodes, selectedNode]);

  const closeConfigPanel = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false
      }))
    );
  }, [setNodes]);

  // Download graph data for editing
  const downloadGraph = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ussd-graph-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

  // Upload/Load graph data
  const loadGraph = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const flowData = JSON.parse(e.target.result);
          if (flowData.nodes && flowData.edges) {
            setNodes(flowData.nodes);
            setEdges(flowData.edges);
            setSelectedNode(null);
          } else {
            alert('Invalid graph file format');
          }
        } catch (error) {
          alert('Error reading file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  }, [setNodes, setEdges]);

  // Download USSD flow for deployment
  const downloadUSSDFlow = useCallback(() => {
    const ussdFlow = nodes.map(node => {
      const flowNode = {
        id: node.id,
        type: node.data.type,
        prompts: node.data.config?.prompts || {},
        transitions: {},
        fallback: ""
      };

      // Find edges coming from this node to build transitions
      const nodeEdges = edges.filter(edge => edge.source === node.id);
      
      // Handle different node types
      if (node.data.type === 'INPUT') {
        flowNode.variableName = node.data.config?.variableName || '';
        flowNode.matchPattern = node.data.config?.matchPattern || '*';
        
        // For INPUT nodes, map edges based on source handles
        nodeEdges.forEach(edge => {
          const pattern = edge.sourceHandle || '*';
          flowNode.transitions[pattern] = edge.target;
        });
        
        // If no edges, use default pattern
        if (Object.keys(flowNode.transitions).length === 0) {
          flowNode.transitions = { '*': '' };
        }
        
      } else if (node.data.type === 'MENU') {
        flowNode.fallback = '';
        
        // For MENU nodes, map edges based on source handles
        nodeEdges.forEach(edge => {
          if (edge.sourceHandle === 'fallback') {
            flowNode.fallback = edge.target;
          } else if (edge.sourceHandle && edge.sourceHandle.startsWith('option-')) {
            const optionNumber = edge.sourceHandle.replace('option-', '');
            flowNode.transitions[optionNumber] = edge.target;
          }
        });
        
      } else if (node.data.type === 'ACTION') {
        flowNode.templates = node.data.config?.templates || [];
        flowNode.transactionCodes = node.data.config?.transactionCodes || [];
        
        // For ACTION nodes, map edges based on transaction codes
        nodeEdges.forEach(edge => {
          if (edge.sourceHandle && edge.sourceHandle.startsWith('transaction-')) {
            const code = edge.sourceHandle.replace('transaction-', '');
            flowNode.transitions[code] = edge.target;
          }
        });
        
      } else if (node.data.type === 'START') {
        // START nodes typically have a single transition
        if (nodeEdges.length > 0) {
          flowNode.transitions = { '': nodeEdges[0].target };
        } else {
          flowNode.transitions = { '': '' };
        }
      }
      // END nodes have no transitions - keep empty

      return flowNode;
    });
    
    const dataStr = JSON.stringify(ussdFlow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ussd-flow-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

  // Clear all data
  const clearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all nodes and edges? This cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      localStorage.removeItem('ussd-editor-autosave');
      console.log('Canvas cleared and auto-save removed');
    }
  }, [setNodes, setEdges]);

  return (
    <div className="ussd-editor">
      <div className="sidebar">
        <NodePalette />
        
        <div className="editor-controls">
          <h4>Editor Controls</h4>
          
          <div className="control-section">
            <h5>Save & Load</h5>
            <button onClick={downloadGraph} className="control-btn">
              📄 Download Graph
            </button>
            <label className="control-btn file-input-label">
              📁 Load Graph
              <input
                type="file"
                accept=".json"
                onChange={loadGraph}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className="control-section">
            <h5>Export</h5>
            <button onClick={downloadUSSDFlow} className="control-btn">
              🚀 Download USSD Flow
            </button>
          </div>

          <div className="control-section">
            <h5>Actions</h5>
            <button onClick={clearAll} className="control-btn danger">
              🗑️ Clear All
            </button>
          </div>
        </div>
        
        <div className="debug-info">
          <h4>Debug Info:</h4>
          <p>Nodes: {nodes.length}</p>
          <p>Edges: {edges.length}</p>
          <p>Selected: {selectedNode ? selectedNode.id : 'None'}</p>
          <p className="auto-save-indicator">✅ Auto-save enabled</p>
        </div>
      </div>
      
      <div className="canvas-container">
        <div className="reactflow-wrapper" style={{ width: '100%', height: '100vh' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            deleteKeyCode={['Delete', 'Backspace']}
            multiSelectionKeyCode={['Control', 'Meta']}
          >
            <Controls />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Configuration Panel - Only show on double-click */}
      {selectedNode && (
        <div className="config-sidebar">
          <NodeConfigPanel
            selectedNode={selectedNode}
            onUpdateNode={updateNodeData}
            onClose={closeConfigPanel}
            allNodes={nodes}
          />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <ReactFlowProvider>
    <SimpleFlow />
  </ReactFlowProvider>
);

export default App;
