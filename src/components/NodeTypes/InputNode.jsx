import React from 'react';
import { Handle, Position } from '@xyflow/react';

const InputNode = ({ data, isConnectable, selected }) => {
  // Get the default language or fallback to 'en'
  const defaultLanguage = data.config?.defaultLanguage || 'en';
  
  // Get the prompt in the default language
  const displayPrompt = data.config?.prompts?.[defaultLanguage] || 
                       data.config?.prompts?.en || 
                       'Please enter your input:';
  
  // Get variable name
  const variableName = data.config?.variableName || data.config?.storeAttribute || '';
  
  // Get match pattern
  const matchPattern = data.config?.matchPattern || '*';

  // Validation status
  const hasPrompt = displayPrompt && displayPrompt.trim() !== '';
  const hasVariableName = variableName && variableName.trim() !== '';
  const nodeStatus = hasPrompt && hasVariableName ? 'valid' : 'warning';

  return (
    <div 
      className={`node input-node ${selected ? 'selected' : ''} ${nodeStatus}`}
      title={`INPUT: ${data.label || 'Input'}\nPrompt: ${displayPrompt}${variableName ? `\nVariable: ${variableName}` : ''}${matchPattern && matchPattern !== '*' ? `\nPattern: ${matchPattern}` : ''}\nStatus: ${nodeStatus}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#6366f1' }}
      />
      
      <div className="node-header">
        <div className="node-header-content">
          <div className="node-title truncate-text">
            {data.label || 'Input'}
          </div>
          <div className="node-type">INPUT</div>
        </div>
        <div className={`node-status ${nodeStatus}`}>
          {nodeStatus === 'valid' ? '✅' : '⚠️'}
        </div>
      </div>
      
      <div className="node-preview">
        <div className="prompt-preview truncate-multiline">
          {displayPrompt}
        </div>
        {variableName && (
          <div className="variable-name truncate-text">
            <span className="variable-icon">📝</span> Variable: <strong>{variableName}</strong>
          </div>
        )}
        {matchPattern && matchPattern !== '*' && (
          <div className="match-pattern truncate-text">
            <span className="pattern-icon">🔍</span> Pattern: <code>{matchPattern}</code>
          </div>
        )}
        {!hasVariableName && (
          <div className="validation-warning">
            ⚠️ Variable name required
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default InputNode;
