import React from 'react';
import { Handle, Position } from '@xyflow/react';

const ActionNode = ({ data, isConnectable, selected }) => {
  // Get templates and response codes from config
  const templates = data.config?.templates || [];
  const responseCodes = data.config?.responseCodes || [];
  // Legacy support for old transactionCodes
  const legacyTransactionCodes = data.config?.transactionCodes || [];
  
  // Combine new and legacy response codes
  const allResponseCodes = responseCodes.length > 0 ? responseCodes : 
    legacyTransactionCodes.map(code => ({ 
      code, 
      isResponseParsingEnabled: false, 
      conditions: [] 
    }));
  
  // Validation status
  const hasTemplates = templates.length > 0;
  const hasValidResponseCodes = allResponseCodes.length > 0;
  const nodeStatus = hasTemplates && hasValidResponseCodes ? 'valid' : 'warning';
  
  // Calculate total connection points (for conditional parsing)
  const getTotalConnectionPoints = () => {
    return allResponseCodes.reduce((total, responseCode) => {
      if (responseCode.isResponseParsingEnabled && responseCode.conditions?.length > 0) {
        return total + responseCode.conditions.length + 1; // +1 for NoMatch
      }
      return total + 1; // Direct connection
    }, 0);
  };
  
  return (
    <div 
      className={`node action-node ${selected ? 'selected' : ''} ${nodeStatus}`}
      title={`ACTION: ${data.label || 'Action'}\nTemplates: ${templates.map(t => t.name || t._id || t.id).join(', ') || 'None'}\nResponse Codes: ${allResponseCodes.map(rc => rc.code).join(', ')}\nConnection Points: ${getTotalConnectionPoints()}\nStatus: ${nodeStatus}`}
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

        {/* Enhanced Response Codes Section with Conditional Connections */}
        <div className="transactions-section">
          <div className="section-title">Response Codes:</div>
          <div className="transactions-list">
            {allResponseCodes.map((responseCode, index) => {
              const code = responseCode.code;
              const codeType = code?.startsWith('2') ? 'success' : 
                             code?.startsWith('4') ? 'error' : 'server-error';
              
              // Check if this response code has conditional parsing enabled
              const hasConditionalParsing = responseCode.isResponseParsingEnabled && 
                                          responseCode.conditions?.length > 0;
              
              if (hasConditionalParsing) {
                // Render multiple connection points for each condition + NoMatch
                return (
                  <div key={code} className="response-code-group">
                    <div className={`response-code-header ${codeType}`}>
                      <span className="response-code-text">
                        {code} 🔍
                      </span>
                      <span className="conditional-indicator">
                        ({responseCode.conditions.length + 1} paths)
                      </span>
                    </div>
                    
                    {/* Render connection handles for each condition */}
                    {responseCode.conditions.map((condition, condIndex) => (
                      <div key={`${code}-${condition.name}`} className="condition-item">
                        <span className="condition-text truncate-text" title={`Condition: ${condition.name}`}>
                          📌 {condition.name}
                        </span>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`response-${code}-${condition.name}`}
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
                    ))}
                    
                    {/* NoMatch/Default connection */}
                    <div className="condition-item">
                      <span className="condition-text truncate-text" title="Default path when no conditions match">
                        🔄 NoMatch
                      </span>
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={`response-${code}-NoMatch`}
                        isConnectable={isConnectable}
                        style={{
                          position: 'relative',
                          right: 'auto',
                          top: 'auto',
                          transform: 'none',
                          background: '#6b7280',
                          width: '8px',
                          height: '8px',
                          border: '1px solid #fff'
                        }}
                      />
                    </div>
                  </div>
                );
              } else {
                // Render single connection point for direct routing
                return (
                  <div key={code} className={`transaction-item ${codeType}`}>
                    <span className="transaction-text truncate-text" title={`Response Code: ${code}`}>
                      {code}
                      {code?.startsWith('5') && <span style={{ fontSize: '0.8em', marginLeft: '4px' }}>🔗</span>}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`response-${code}`}
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
              }
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
