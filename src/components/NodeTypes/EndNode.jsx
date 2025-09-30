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
        {data.config?.compositCode && (
          <div className="composite-code" style={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: '#374151',
            backgroundColor: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '3px',
            marginTop: '2px'
          }}>
            {data.config.compositCode}
          </div>
        )}
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
