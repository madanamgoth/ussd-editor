import React, { useState } from 'react';
import { exportToFlowFormat, validateFlow, importFromFlowFormat, generateEdgesFromNodes } from '../utils/flowUtils';
import AIFlowGenerator from './AIFlowGenerator';

const FlowControls = ({ nodes, edges, onImport, onClear, onAutoLayout }) => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [importData, setImportData] = useState('');
  const [exportData, setExportData] = useState('');
  const [exportType, setExportType] = useState('flow'); // 'flow' or 'graph'
  const [validationResult, setValidationResult] = useState(null);

  const handleExport = (type = 'flow') => {
    let exportJson;
    if (type === 'graph') {
      // Export complete graph data with positions, visual properties, etc.
      const graphData = {
        nodes,
        edges,
        timestamp: new Date().toISOString()
      };
      exportJson = JSON.stringify(graphData, null, 2);
    } else {
      // Export simplified flow data for backend processing
      const flowData = exportToFlowFormat(nodes);
      exportJson = JSON.stringify(flowData, null, 2);
    }
    setExportType(type);
    setExportData(exportJson);
    setShowExport(true);
  };

  const handleImport = () => {
    try {
      const importedData = JSON.parse(importData);
      
      // Check if it's a graph format (has nodes and edges arrays) or flow format (array of nodes)
      if (importedData.nodes && importedData.edges && Array.isArray(importedData.nodes)) {
        // Graph format - import complete graph
        onImport(importedData, 'graph');
      } else if (Array.isArray(importedData)) {
        // Flow format - import simplified flow
        onImport(importedData, 'flow');
      } else {
        throw new Error('Unknown format');
      }
      
      setShowImport(false);
      setImportData('');
    } catch (error) {
      alert('Invalid JSON format. Please check your data and ensure it\'s a valid graph or flow JSON format.');
    }
  };

  const handleFileImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            
            // Check if it's a graph format or flow format
            if (importedData.nodes && importedData.edges && Array.isArray(importedData.nodes)) {
              // Graph format - import complete graph
              onImport(importedData, 'graph');
            } else if (Array.isArray(importedData)) {
              // Flow format - import simplified flow
              onImport(importedData, 'flow');
            } else {
              throw new Error('Unknown format');
            }
            
            setShowImport(false);
            setImportData('');
          } catch (error) {
            alert('Invalid JSON file. Please check your file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
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
        
        <button onClick={() => handleExport('flow')} className="control-btn export-btn">
          📤 Export Flow
        </button>
        
        <button onClick={() => handleExport('graph')} className="control-btn export-btn graph-export">
          🎨 Export Graph
        </button>
        
        <button onClick={() => setShowImport(true)} className="control-btn import-btn">
          📥 Import Graph
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
              <h3>{exportType === 'graph' ? 'Export Graph JSON' : 'Export Flow JSON'}</h3>
              <button onClick={() => setShowExport(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="export-info">
                {exportType === 'graph' ? (
                  <p>🎨 <strong>Complete Graph Export:</strong> Includes all visual properties, positions, and canvas state. Use this to save/restore your complete editor state.</p>
                ) : (
                  <p>📤 <strong>Flow Export:</strong> Simplified format for backend processing. Contains only business logic without visual properties.</p>
                )}
              </div>
              
              <div className="export-actions">
                <button 
                  onClick={() => copyToClipboard(exportData)}
                  className="action-btn copy-btn"
                >
                  📋 Copy to Clipboard
                </button>
                <button 
                  onClick={() => downloadJson(exportData, exportType === 'graph' ? 'ussd-graph.json' : 'ussd-flow.json')}
                  className="action-btn download-btn"
                >
                  💾 Download {exportType === 'graph' ? 'Graph' : 'Flow'} JSON
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
              <h3>Import Graph JSON</h3>
              <button onClick={() => setShowImport(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="import-instructions">
                <p><strong>Import your saved graph to restore the complete UI state:</strong></p>
                <ul>
                  <li>🎨 <strong>Graph JSON:</strong> Complete graph with positions (recommended - from "Export Graph")</li>
                  <li>📤 <strong>Flow JSON:</strong> Simplified flow data (will auto-generate positions)</li>
                </ul>
              </div>
              
              <div className="import-methods">
                <div className="import-method">
                  <h4>📁 Import from File</h4>
                  <p>Upload a JSON file from your computer</p>
                  <button onClick={handleFileImport} className="file-import-btn">
                    📂 Choose JSON File
                  </button>
                </div>
                
                <div className="import-divider">
                  <span>OR</span>
                </div>
                
                <div className="import-method">
                  <h4>📋 Paste JSON Data</h4>
                  <p>Copy and paste JSON data directly</p>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste JSON data here..."
                    className="import-textarea"
                    rows={12}
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button onClick={() => setShowImport(false)} className="cancel-btn">
                  Cancel
                </button>
                <button 
                  onClick={handleImport} 
                  className="import-btn"
                  disabled={!importData.trim()}
                >
                  Import Graph
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
