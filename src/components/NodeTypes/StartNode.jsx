import React from 'react';
import { Handle, Position } from '@xyflow/react';

const StartNode = ({ data, isConnectable, selected }) => {
  const label = data.label || 'Start';
  const prompts = data.config?.prompts || {
    en: 'Welcome to our service',
    es: '',
    fr: '',
    ar: ''
  };
  const defaultLang = data.config?.defaultLanguage || 'en';
  const displayPrompt = prompts[defaultLang] || prompts.en || 'No prompt set';

  return (
    <div 
      className={`node start-node ${selected ? 'selected' : ''}`}
      title={`START: ${label}\nPrompt (${defaultLang.toUpperCase()}): ${displayPrompt}`}
    >
      <div className="node-header">
        <div className="node-title truncate-text" title="Click to select, double-click to configure">
          {label}
        </div>
        <div className="node-type">START</div>
      </div>
      
      <div className="node-preview">
        <div className="prompt-preview-text truncate-multiline">
          <strong>Prompt ({defaultLang.toUpperCase()}):</strong> {displayPrompt}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default StartNode;
