import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const DynamicMenuNode = memo(({ data, isConnectable, selected }) => {
  const config = data.config || {};
  const prompts = config.prompts || {};
  const currentPrompt = prompts[config.defaultLanguage || 'en'] || prompts.en || 'Dynamic Menu';
  
  // Get API configuration
  const apiConfig = config.apiConfig || {};
  const dataSource = config.dataSource || {};
  const menuMapping = config.menuMapping || {};
  
  // Create handles for different scenarios
  const createMenuHandles = () => {
    const handles = [];
    
    // Default connection handles for design time
    for (let i = 1; i <= (config.maxMenuItems || 5); i++) {
      handles.push(
        <Handle
          key={`option-${i}`}
          id={`option-${i}`}
          type="source"
          position={Position.Right}
          style={{
            top: `${20 + (i * 15)}%`,
            background: '#4ade80',
            border: '2px solid #22c55e',
            width: '12px',
            height: '12px'
          }}
          isConnectable={isConnectable}
          title={`Menu Option ${i} connection`}
        />
      );
    }
    
    // Fallback handle for invalid selections
    handles.push(
      <Handle
        key="fallback"
        id="fallback"
        type="source"
        position={Position.Right}
        style={{
          bottom: '10px',
          background: '#f87171',
          border: '2px solid #ef4444',
          width: '12px',
          height: '12px'
        }}
        isConnectable={isConnectable}
        title="Fallback for invalid selections"
      />
    );
    
    return handles;
  };

  return (
    <div className={`flow-node dynamic-menu-node ${selected ? 'selected' : ''}`}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#6366f1', border: '2px solid #4f46e5' }}
        isConnectable={isConnectable}
      />
      
      <div className="node-header">
        <div className="node-icon">📱</div>
        <div className="node-title">DYNAMIC MENU</div>
      </div>
      
      <div className="node-content">
        <div className="node-id">{data.label || data.id}</div>
        <div className="node-prompt">
          {currentPrompt.length > 100 
            ? `${currentPrompt.substring(0, 100)}...` 
            : currentPrompt
          }
        </div>
        
        {/* Data Source Display */}
        <div className="data-source-info">
          {dataSource.type === 'session' ? (
            <div className="session-data">
              📋 Session Variable: {dataSource.sessionVariable || 'Not configured'}
              {dataSource.responseKey && (
                <div className="response-key">
                  🔍 Data Path: {dataSource.responseKey}
                </div>
              )}
            </div>
          ) : (
            <div className="api-endpoint">
              🔗 {apiConfig.method || 'GET'} {apiConfig.endpoint || 'Not configured'}
            </div>
          )}
          {(dataSource.nameField || apiConfig.nameField) && (
            <div className="field-mapping">
              � Name: {dataSource.nameField || apiConfig.nameField} | ID: {dataSource.idField || apiConfig.idField}
            </div>
          )}
        </div>
        
        {/* Menu Mapping Info */}
        {Object.keys(menuMapping).length > 0 && (
          <div className="menu-mapping-info">
            <div className="mapping-title">Menu Mappings:</div>
            {Object.entries(menuMapping).slice(0, 3).map(([condition, nodeId]) => (
              <div key={condition} className="mapping-item">
                {condition}: → {nodeId}
              </div>
            ))}
            {Object.keys(menuMapping).length > 3 && (
              <div className="mapping-more">...and {Object.keys(menuMapping).length - 3} more</div>
            )}
          </div>
        )}
      </div>
      
      {/* Output handles */}
      {createMenuHandles()}
    </div>
  );
});

DynamicMenuNode.displayName = 'DynamicMenuNode';

export default DynamicMenuNode;