import React from 'react';
import { Handle, Position } from '@xyflow/react';

const ActionNode = ({ data, isConnectable, selected }) => {
  // Get templates and transaction codes from config
  const templates = data.config?.templates || [];
  const transactionCodes = data.config?.transactionCodes || ['200', '400', '500'];
  
  return (
    <div 
      className={`node action-node ${selected ? 'selected' : ''}`}
      title={`ACTION: ${data.label || 'Action'}\nTemplates: ${templates.map(t => t.name || t.id).join(', ') || 'None'}\nTransaction Codes: ${transactionCodes.join(', ')}`}
    >
      <div className="node-header">
        <div className="node-title truncate-text">
          {data.label || 'Action'}
        </div>
        <div className="node-type">ACTION</div>
      </div>
      
      <div className="node-preview">
        {/* Templates Section */}
        <div className="templates-section">
          <div className="section-title">Templates:</div>
          {templates.length > 0 ? (
            <div className="templates-list">
              {templates.map((template, index) => (
                <div key={index} className="template-item">
                  <span className="template-text truncate-text" title={template.name || template.id}>
                    {template.name || template.id}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`template-${index}`}
                    isConnectable={isConnectable}
                    style={{
                      position: 'relative',
                      right: 'auto',
                      top: 'auto',
                      transform: 'none',
                      background: '#3b82f6',
                      width: '8px',
                      height: '8px',
                      border: '1px solid #fff'
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="no-items">No templates added</div>
          )}
        </div>

        {/* Transaction Codes Section */}
        <div className="transactions-section">
          <div className="section-title">Transaction Codes:</div>
          <div className="transactions-list">
            {transactionCodes.map((code, index) => {
              const codeType = code.startsWith('2') ? 'success' : 
                             code.startsWith('4') ? 'error' : 'server-error';
              
              return (
                <div key={code} className={`transaction-item ${codeType}`}>
                  <span className="transaction-text truncate-text" title={`Transaction Code: ${code}`}>
                    {code}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`transaction-${code}`}
                    isConnectable={isConnectable}
                    style={{
                      position: 'relative',
                      right: 'auto',
                      top: 'auto',
                      transform: 'none',
                      background: codeType === 'success' ? '#10b981' : 
                                 codeType === 'error' ? '#f59e0b' : '#ef4444',
                      width: '8px',
                      height: '8px',
                      border: '1px solid #fff'
                    }}
                  />
                </div>
              );
            })}
          </div>
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

export default ActionNode;
