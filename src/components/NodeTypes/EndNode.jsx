import React from 'react';
import { Handle, Position } from '@xyflow/react';

const EndNode = ({ data, isConnectable, selected }) => {
  // Get the default language or fallback to 'en'
  const defaultLanguage = data.config?.defaultLanguage || 'en';
  
  // Get the prompt in the default language
  const displayPrompt = data.config?.prompts?.[defaultLanguage] || 
                       data.config?.prompts?.en || 
                       'Thank you for using our service!';

  return (
    <div 
      className={`node end-node ${selected ? 'selected' : ''}`}
      title={`END: ${data.label || 'End'}\nMessage: ${displayPrompt}`}
    >
      <div className="node-header">
        <div className="node-title truncate-text">
          {data.label || 'End'}
        </div>
        <div className="node-type">END</div>
      </div>
      
      <div className="node-preview">
        <div className="prompt-preview truncate-multiline">
          {displayPrompt}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default EndNode;
