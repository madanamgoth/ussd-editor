import React, { useState, useEffect } from 'react';
import TemplateCreator from './TemplateCreator';

const NodeConfigPanel = ({ selectedNode, onUpdateNode, onClose, allNodes = [] }) => {
  const [config, setConfig] = useState({
    id: '',
    name: '',
    prompts: {
      en: '',
      es: '',
      fr: '',
      ar: ''
    },
    defaultLanguage: 'en',
    variableName: '',
    matchPattern: '*',
    menuConnections: {},
    fallback: '',
    templates: [],
    transactionCodes: ['200', '400', '500']
  });

  const [showTemplateCreator, setShowTemplateCreator] = useState(false);

  // Get available variables from INPUT nodes in the flow
  const getAvailableVariables = () => {
    const variables = [];
    allNodes.forEach(node => {
      if (node.data.type === 'INPUT' && node.data.config?.variableName) {
        variables.push(node.data.config.variableName);
      }
    });
    return variables;
  };

  useEffect(() => {
    if (selectedNode) {
      // Extract menu options for MENU nodes
      let menuConnections = {};
      if (selectedNode.data.type === 'MENU') {
        const prompt = selectedNode.data.config?.prompts?.en || '';
        const lines = prompt.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const match = line.match(/^(\d+)\./);
          if (match) {
            const optionNumber = match[1];
            menuConnections[optionNumber] = selectedNode.data.config?.transitions?.[optionNumber] || '';
          }
        });
      }

      setConfig({
        id: selectedNode.id,
        name: selectedNode.data.label || '',
        prompts: selectedNode.data.config?.prompts || {
          en: '',
          es: '',
          fr: '',
          ar: ''
        },
        defaultLanguage: selectedNode.data.config?.defaultLanguage || 'en',
        variableName: selectedNode.data.config?.variableName || selectedNode.data.config?.storeAttribute || '',
        matchPattern: selectedNode.data.config?.matchPattern || '*',
        menuConnections: menuConnections,
        fallback: selectedNode.data.config?.fallback || '',
        templates: selectedNode.data.config?.templates || [],
        transactionCodes: selectedNode.data.config?.transactionCodes || ['200', '400', '500']
      });
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (onUpdateNode && selectedNode) {
      const updatedConfig = {
        ...selectedNode.data.config,
        prompts: config.prompts,
        defaultLanguage: config.defaultLanguage
      };

      // Add node-specific config
      if (selectedNode.data.type === 'INPUT') {
        updatedConfig.variableName = config.variableName;
        updatedConfig.matchPattern = config.matchPattern;
      } else if (selectedNode.data.type === 'MENU') {
        updatedConfig.transitions = config.menuConnections;
        updatedConfig.fallback = config.fallback;
      } else if (selectedNode.data.type === 'ACTION') {
        updatedConfig.templates = config.templates;
        updatedConfig.transactionCodes = config.transactionCodes;
      }

      onUpdateNode(selectedNode.id, {
        label: config.name,
        config: updatedConfig
      });
    }
  };

  const handlePromptChange = (lang, value) => {
    const newPrompts = { ...config.prompts, [lang]: value };
    
    // If changing English prompt and this is a MENU node, update menu connections
    if (lang === 'en' && selectedNode?.data.type === 'MENU') {
      const lines = value.split('\n').filter(line => line.trim());
      const newMenuConnections = {};
      
      lines.forEach(line => {
        const match = line.match(/^(\d+)\./);
        if (match) {
          const optionNumber = match[1];
          // Keep existing connection if it exists, otherwise empty string
          newMenuConnections[optionNumber] = config.menuConnections[optionNumber] || '';
        }
      });
      
      setConfig(prev => ({
        ...prev,
        prompts: newPrompts,
        menuConnections: newMenuConnections
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        prompts: newPrompts
      }));
    }
  };

  const handleCreateTemplate = (templateData) => {
    setConfig(prev => ({
      ...prev,
      templates: [...prev.templates, templateData]
    }));
    setShowTemplateCreator(false);
  };

  if (!selectedNode) {
    return (
      <div className="config-panel">
        <div className="config-header">
          <h3>Node Configuration</h3>
        </div>
        <div className="config-content">
          <p className="no-selection">Select a node to edit its configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3>Configure {selectedNode.data.type} Node</h3>
        <button onClick={onClose} className="close-config-btn">×</button>
      </div>
      
      <div className="config-content">
        <div className="config-section">
          <label>Node ID:</label>
          <input
            type="text"
            value={config.id}
            readOnly
            className="readonly-input"
          />
        </div>

        <div className="config-section">
          <label>Node Name:</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter node name"
          />
        </div>

        <div className="config-section">
          <label>Prompts:</label>
          <div className="default-language-selector">
            <label>Default Language:</label>
            <select
              value={config.defaultLanguage}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultLanguage: e.target.value }))}
            >
              <option value="en">English (EN)</option>
              <option value="es">Spanish (ES)</option>
              <option value="fr">French (FR)</option>
              <option value="ar">Arabic (AR)</option>
            </select>
          </div>
          <div className="prompts-config">
            {Object.entries(config.prompts).map(([lang, text]) => (
              <div key={lang} className="prompt-config">
                <label className="prompt-lang-label">
                  {lang.toUpperCase()}:
                </label>
                <textarea
                  value={text}
                  onChange={(e) => handlePromptChange(lang, e.target.value)}
                  placeholder={`Enter ${lang.toUpperCase()} prompt...`}
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Additional config for specific node types */}
        {selectedNode.data.type === 'INPUT' && (
          <>
            <div className="config-section">
              <label>Variable Name:</label>
              <input
                type="text"
                value={config.variableName}
                onChange={(e) => setConfig(prev => ({ ...prev, variableName: e.target.value }))}
                placeholder="Variable name to store input"
              />
            </div>
            
            <div className="config-section">
              <label>Match Pattern:</label>
              <select
                value={config.matchPattern}
                onChange={(e) => setConfig(prev => ({ ...prev, matchPattern: e.target.value }))}
              >
                <option value="*">* (Any input)</option>
                <option value="">Empty (Direct transition)</option>
                <option value="^[0-9]+$">Numbers only</option>
                <option value="^[a-zA-Z]+$">Letters only</option>
                <option value="^[0-9]{1,2}$">1-2 digits</option>
                <option value="^[0-9]{4}$">4 digits (PIN)</option>
              </select>
            </div>
          </>
        )}

        {selectedNode.data.type === 'ACTION' && (
          <>
            {/* Templates Section */}
            <div className="config-section">
              <div className="section-header">
                <label>🔗 API Templates</label>
                <button
                  type="button"
                  onClick={() => setShowTemplateCreator(true)}
                  className="add-template-btn"
                >
                  ➕ Add Template
                </button>
              </div>
              <div className="templates-config">
                {config.templates.map((template, index) => (
                  <div key={index} className="template-config-item">
                    <div className="template-info">
                      <div className="template-id">📋 {template._id || `Template ${index + 1}`}</div>
                      <div className="template-endpoint">
                        {template.target?.method || 'POST'} {template.target?.endpoint || 'No endpoint set'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTemplates = config.templates.filter((_, i) => i !== index);
                        setConfig(prev => ({ ...prev, templates: newTemplates }));
                      }}
                      className="remove-btn"
                      title="Remove template"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
                {config.templates.length === 0 && (
                  <div className="no-templates">
                    <p>📝 No API templates created yet</p>
                    <p>Click "Add Template" above to create your first API template</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Codes Section */}
            <div className="config-section">
              <div className="section-header">
                <label>🔄 Response Codes</label>
              </div>
              <div className="transaction-codes-config">
                <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                  Define HTTP response codes that will create connection points on your action node
                </p>
                {config.transactionCodes.map((code, index) => (
                  <div key={index} className="transaction-code-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <span style={{ 
                        fontSize: '1.2rem',
                        color: code.startsWith('2') ? '#10b981' : 
                               code.startsWith('4') ? '#f59e0b' : '#ef4444'
                      }}>
                        {code.startsWith('2') ? '✅' : 
                         code.startsWith('4') ? '⚠️' : '❌'}
                      </span>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => {
                          const newCodes = [...config.transactionCodes];
                          newCodes[index] = e.target.value;
                          setConfig(prev => ({ ...prev, transactionCodes: newCodes }));
                        }}
                        placeholder="e.g., 200, 400, 500"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newCodes = config.transactionCodes.filter((_, i) => i !== index);
                        setConfig(prev => ({ ...prev, transactionCodes: newCodes }));
                      }}
                      className="remove-btn"
                      title="Remove response code"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      transactionCodes: [...prev.transactionCodes, '']
                    }));
                  }}
                  className="add-btn"
                >
                  ➕ Add Response Code
                </button>
              </div>
            </div>
          </>
        )}

        {selectedNode.data.type === 'MENU' && (
          <>
            <div className="config-section">
              <label>Menu Options & Connections:</label>
              <div className="menu-connections">
                {Object.keys(config.menuConnections).map(option => (
                  <div key={option} className="menu-option-config">
                    <label>Option {option}:</label>
                    <input
                      type="text"
                      value={config.menuConnections[option]}
                      onChange={(e) => {
                        setConfig(prev => ({
                          ...prev,
                          menuConnections: {
                            ...prev.menuConnections,
                            [option]: e.target.value
                          }
                        }));
                      }}
                      placeholder={`Node ID for option ${option}`}
                    />
                  </div>
                ))}
                {Object.keys(config.menuConnections).length === 0 && (
                  <p className="no-options">Add menu options in prompts (e.g., "1. Send Money")</p>
                )}
              </div>
            </div>
            
            <div className="config-section">
              <label>Fallback Node ID:</label>
              <input
                type="text"
                value={config.fallback}
                onChange={(e) => setConfig(prev => ({ ...prev, fallback: e.target.value }))}
                placeholder="Enter fallback node ID"
              />
            </div>
          </>
        )}

        <div className="config-actions">
          <button onClick={handleSave} className="save-btn">
            💾 Save Changes
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>

      {/* Template Creator Modal */}
      {showTemplateCreator && (
        <TemplateCreator
          onClose={() => setShowTemplateCreator(false)}
          onCreate={handleCreateTemplate}
          availableVariables={getAvailableVariables()}
        />
      )}
    </div>
  );
};

export default NodeConfigPanel;
