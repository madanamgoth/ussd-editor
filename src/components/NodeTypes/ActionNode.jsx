import React from 'react';
import { Handle, Position } from '@xyflow/react';

const ActionNode = ({ data, isConnectable, selected }) => {
  // Get templates and transaction codes from config
  const templates = data.config?.templates || [];
  const transactionCodes = data.config?.transactionCodes || ['200', '400', '500'];
  
  // Validation status
  const hasTemplates = templates.length > 0;
  const hasValidTransactionCodes = transactionCodes.length > 0;
  const nodeStatus = hasTemplates && hasValidTransactionCodes ? 'valid' : 'warning';
  
  return (
    <div 
      className={`node action-node ${selected ? 'selected' : ''} ${nodeStatus}`}
      title={`ACTION: ${data.label || 'Action'}\nTemplates: ${templates.map(t => t.name || t._id || t.id).join(', ') || 'None'}\nTransaction Codes: ${transactionCodes.join(', ')}\nStatus: ${nodeStatus}`}
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
            {data.label || 'Action'}
          </div>
          <div className="node-type">ACTION</div>
        </div>
        <div className={`node-status ${nodeStatus}`}>
          {nodeStatus === 'valid' ? '✅' : '⚠️'}
        </div>
      </div>
      
      <div className="node-preview">
        {/* Templates Section - Information Only */}
        <div className="templates-section">
          <div className="section-title">API Templates ({templates.length}):</div>
          {templates.length > 0 ? (
            <div className="templates-list">
              {templates.map((template, index) => (
                <div key={index} className="template-item info-only">
                  <span className="template-icon">🔗</span>
                  <span className="template-text truncate-text" title={template.name || template._id || template.id}>
                    {template.name || template._id || template.id}
                  </span>
                  <span className="template-method">
                    {template.target?.method || 'POST'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-items">No API templates configured</div>
          )}
        </div>

        {/* Transaction Codes Section - These create the actual output handles */}
        <div className="transactions-section">
          <div className="section-title">Response Codes:</div>
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
