import React, { useState } from 'react';
import { exportToFlowFormat, validateFlow, importFromFlowFormat, generateEdgesFromNodes } from '../utils/flowUtils';
import AIFlowGenerator from './AIFlowGenerator';

const FlowControls = ({ nodes, edges, onImport, onClear, onAutoLayout }) => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportData, setExportData] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleExport = () => {
    const flowData = exportToFlowFormat(nodes);
    const exportJson = JSON.stringify(flowData, null, 2);
    setExportData(exportJson);
    setShowExport(true);
  };

  const handleImport = () => {
    try {
      const flowData = JSON.parse(importData);
      onImport(flowData);
      setShowImport(false);
      setImportData('');
    } catch (error) {
      alert('Invalid JSON format. Please check your data.');
    }
  };

  const handleAIGenerate = (generatedFlow) => {
    const importedNodes = importFromFlowFormat(generatedFlow.flow);
    const importedEdges = generateEdgesFromNodes(importedNodes);
    
    // Update transitions based on generated edges
    importedNodes.forEach((node, index) => {
      if (index < importedNodes.length - 1) {
        const nextNode = importedNodes[index + 1];
        if (node.data.type === 'START') {
          node.data.config.transitions[''] = nextNode.id;
        } else if (node.data.type === 'INPUT') {
          node.data.config.transitions['*'] = nextNode.id;
        } else if (node.data.type === 'ACTION') {
          node.data.config.transitions['200'] = nextNode.id;
        }
      }
    });
    
    onImport(generatedFlow.flow);
  };

  const handleValidate = () => {
    const result = validateFlow(nodes, edges);
    setValidationResult(result);
    setShowValidation(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flow-controls">
      <div className="controls-header">
        <h3>Flow Controls</h3>
      </div>
      
      <div className="controls-buttons">
        <AIFlowGenerator onGenerate={handleAIGenerate} />
        
        <button onClick={handleExport} className="control-btn export-btn">
          📤 Export Flow
        </button>
        
        <button onClick={() => setShowImport(true)} className="control-btn import-btn">
          📥 Import Flow
        </button>
        
        <button onClick={handleValidate} className="control-btn validate-btn">
          ✅ Validate Flow
        </button>
        
        <button onClick={onAutoLayout} className="control-btn layout-btn">
          🎯 Auto Layout
        </button>
        
        <button onClick={onClear} className="control-btn clear-btn">
          🗑️ Clear All
        </button>
      </div>

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Export Flow JSON</h3>
              <button onClick={() => setShowExport(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="export-actions">
                <button 
                  onClick={() => copyToClipboard(exportData)}
                  className="action-btn copy-btn"
                >
                  📋 Copy to Clipboard
                </button>
                <button 
                  onClick={() => downloadJson(exportData, 'ussd-flow.json')}
                  className="action-btn download-btn"
                >
                  💾 Download JSON
                </button>
              </div>
              
              <textarea
                value={exportData}
                readOnly
                className="export-textarea"
                rows={20}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Import Flow JSON</h3>
              <button onClick={() => setShowImport(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="import-instructions">
                <p>Paste your flow JSON data below:</p>
              </div>
              
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON data here..."
                className="import-textarea"
                rows={15}
              />
              
              <div className="modal-actions">
                <button onClick={() => setShowImport(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleImport} className="import-btn">
                  Import Flow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidation && validationResult && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Flow Validation Results</h3>
              <button onClick={() => setShowValidation(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="validation-results">
                {validationResult.errors.length > 0 && (
                  <div className="validation-section errors">
                    <h4>❌ Errors ({validationResult.errors.length})</h4>
                    <ul>
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="error-item">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResult.warnings.length > 0 && (
                  <div className="validation-section warnings">
                    <h4>⚠️ Warnings ({validationResult.warnings.length})</h4>
                    <ul>
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="warning-item">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                  <div className="validation-section success">
                    <h4>✅ Validation Passed</h4>
                    <p>Your flow has no errors or warnings!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="controls-stats">
        <div className="stat-item">
          <span className="stat-label">Nodes:</span>
          <span className="stat-value">{nodes.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Edges:</span>
          <span className="stat-value">{edges.length}</span>
        </div>
      </div>
    </div>
  );
};

export default FlowControls;
