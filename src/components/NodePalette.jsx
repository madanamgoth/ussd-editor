import React from 'react';

const NodePalette = ({ onNodeDrop }) => {
  const nodeTemplates = [
    {
      type: 'start',
      label: 'START',
      icon: '🚀',
      description: 'Entry point of the flow'
    },
    {
      type: 'menu',
      label: 'MENU',
      icon: '📋',
      description: 'Menu with multiple options'
    },
    {
      type: 'input',
      label: 'INPUT',
      icon: '⌨️',
      description: 'Collect user input'
    },
    {
      type: 'action',
      label: 'ACTION',
      icon: '⚡',
      description: 'Execute an action/API call'
    },
    {
      type: 'end',
      label: 'END',
      icon: '🏁',
      description: 'End point of the flow'
    }
  ];

  const handleDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h3>Node Palette</h3>
        <p>Drag nodes to canvas</p>
      </div>
      
      <div className="palette-nodes">
        {nodeTemplates.map((template) => (
          <div
            key={template.type}
            className={`palette-node ${template.type}-palette`}
            draggable
            onDragStart={(event) => handleDragStart(event, template.type)}
          >
            <div className="palette-node-icon">{template.icon}</div>
            <div className="palette-node-content">
              <div className="palette-node-label">{template.label}</div>
              <div className="palette-node-description">{template.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="palette-footer">
        <div className="palette-instructions">
          <h4>How to Use:</h4>
          <ul>
            <li><strong>Add Nodes:</strong> Drag from palette to canvas</li>
            <li><strong>Select:</strong> Single-click any node</li>
            <li><strong>Configure:</strong> Double-click node to edit settings</li>
            <li><strong>Connect:</strong> Drag from output dots (●) to input handles</li>
            <li><strong>Delete:</strong> Select node/edge and press Delete key</li>
            <li><strong>Multi-select:</strong> Hold Ctrl/Cmd while clicking</li>
          </ul>
          
          <div className="tip-box">
            <strong>💡 Tips:</strong><br/>
            • Menu options each have their own connection dot<br/>
            • Action nodes have dots for templates & transaction codes<br/>
            • Hover over nodes to see full text content
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
