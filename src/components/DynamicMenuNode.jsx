import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const DynamicMenuNode = memo(({ data, isConnectable, selected }) => {
  const config = data.config || {};
  const prompts = config.prompts || {};
  const currentPrompt = prompts[config.defaultLanguage || 'en'] || prompts.en || 'Dynamic Menu';
  
  // Get API configuration
  const apiConfig = config.apiConfig || {};
  const dataSource = config.dataSource || {};
  const routingStrategy = config.routingStrategy || {};

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
              🏷️ Name: {dataSource.nameField || apiConfig.nameField} | ID: {dataSource.idField || apiConfig.idField}
            </div>
          )}
        </div>
        
        {/* Routing Strategy Info */}
        <div className="routing-info">
          <div className="routing-title">Routing Strategy:</div>
          <div className="routing-type">
            {routingStrategy.type === 'single' && '🎯 Single Target'}
            {routingStrategy.type === 'conditional' && '🔀 Conditional Routing'}
            {routingStrategy.type === 'fixed' && '📌 Fixed Mapping'}
            {!routingStrategy.type && '⚙️ Not configured'}
          </div>
          {routingStrategy.type === 'single' && routingStrategy.singleTarget && (
            <div className="target-info">→ {routingStrategy.singleTarget}</div>
          )}
        </div>
      </div>
      
      {/* Single output handle - dynamic routing handled internally */}
      <Handle
        key="dynamic-output"
        id="dynamic-output"
        type="source"
        position={Position.Right}
        style={{
          top: '50%',
          background: '#4ade80',
          border: '2px solid #22c55e',
          width: '12px',
          height: '12px'
        }}
        isConnectable={isConnectable}
        title="Dynamic menu selection output"
      />
      
      {/* Fallback handle for errors/invalid selections */}
      <Handle
        key="fallback"
        id="fallback"
        type="source"
        position={Position.Right}
        style={{
          bottom: '15px',
          background: '#f87171',
          border: '2px solid #ef4444',
          width: '12px',
          height: '12px'
        }}
        isConnectable={isConnectable}
        title="Fallback for invalid selections or errors"
      />
    </div>
  );
});

DynamicMenuNode.displayName = 'DynamicMenuNode';

export default DynamicMenuNode;