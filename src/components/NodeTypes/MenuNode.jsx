import React from 'react';
import { Handle, Position } from '@xyflow/react';

const MenuNode = ({ data, isConnectable, selected }) => {
  // Get the default language or fallback to 'en'
  const defaultLanguage = data.config?.defaultLanguage || 'en';
  
  // Get the prompt in the default language
  const displayPrompt = data.config?.prompts?.[defaultLanguage] || 
                       data.config?.prompts?.en || 
                       '1. Send Money\n2. Check Balance\n3. Pay Bills';
  
  // Extract menu options from the prompt
  const getMenuOptions = () => {
    const lines = displayPrompt.split('\n').filter(line => line.trim());
    const options = [];
    
    lines.forEach(line => {
      const match = line.match(/^(\d+)\./);
      if (match) {
        options.push({
          number: match[1],
          text: line.replace(/^\d+\.\s*/, '')
        });
      }
    });
    
    return options;
  };

  const menuOptions = getMenuOptions();

  // Validation status
  const hasPrompt = displayPrompt && displayPrompt.trim() !== '';
  const hasMenuOptions = menuOptions.length > 0;
  const nodeStatus = hasPrompt && hasMenuOptions ? 'valid' : 'warning';

  return (
    <div 
      className={`node menu-node ${selected ? 'selected' : ''} ${nodeStatus}`}
      title={`MENU: ${data.label || 'Menu'}\nOptions (${menuOptions.length}):\n${menuOptions.map(opt => `${opt.number}. ${opt.text}`).join('\n')}\nStatus: ${nodeStatus}`}
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
            {data.label || 'Menu'}
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
          <div className="node-type">MENU</div>
        </div>
        <div className={`node-status ${nodeStatus}`}>
          {nodeStatus === 'valid' ? '✅' : '⚠️'}
        </div>
      </div>
      
      <div className="node-preview">
        <div className="menu-options-list">
          {menuOptions.map((option, index) => {
            return (
              <div key={option.number} className="menu-option-item">
                <span className="option-text truncate-text" title={`${option.number}. ${option.text}`}>
                  {option.number}. {option.text}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${option.number}`}
                  isConnectable={isConnectable}
                  style={{
                    position: 'relative',
                    right: 'auto',
                    top: 'auto',
                    transform: 'none',
                    background: '#555',
                    width: '8px',
                    height: '8px',
                    border: '1px solid #fff'
                  }}
                />
              </div>
            );
          })}
          
          {menuOptions.length === 0 && (
            <div className="no-menu-options">
              No menu options defined
            </div>
          )}
        </div>
        
        {/* Fallback connection */}
        {menuOptions.length > 0 && (
          <div className="fallback-status">
            <span className="fallback-label">Fallback:</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="fallback"
              isConnectable={isConnectable}
              style={{
                position: 'relative',
                bottom: 'auto',
                left: 'auto',
                transform: 'none',
                background: '#f59e0b',
                width: '8px',
                height: '8px',
                border: '1px solid #fff'
              }}
            />
          </div>
        )}
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

export default MenuNode;
