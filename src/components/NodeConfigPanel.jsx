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
    transactionCodes: ['200', '400', '500'],
    // Dynamic menu specific fields
    dataSource: {
      type: 'session',
      sessionVariable: '',
      responseKey: 'data',
      nameField: 'name',
      idField: 'id',
      filterField: '',
      filterValue: '',
      sortBy: '',
      sortOrder: 'asc'
    },
    apiConfig: {
      endpoint: '',
      method: 'GET',
      headers: {},
      responseKey: 'data',
      nameField: 'name',
      idField: 'id'
    },
    menuMapping: {},
    maxMenuItems: 10,
    // Routing strategy for dynamic connections
    routingStrategy: {
      type: 'conditional',
      fixedMapping: {},
      conditionalRules: [],
      singleTarget: '',
      defaultTarget: ''
    }
  });

  const [showTemplateCreator, setShowTemplateCreator] = useState(false);

  // Get available variables from INPUT nodes in the flow
  const getAvailableVariables = () => {
    const variables = [];
    const variablesByTemplate = {}; // Group variables by template
    
    allNodes.forEach(node => {
      // Extract variables from INPUT nodes
      if (node.data.type === 'INPUT' && node.data.config?.variableName) {
        variables.push(node.data.config.variableName);
      }
      
      // Extract session variables from ACTION nodes' response templates
      if (node.data.type === 'ACTION' && node.data.config?.templates) {
        node.data.config.templates.forEach(template => {
          const templateName = template._id || template.name || 'Unnamed Template';
          
          if (!variablesByTemplate[templateName]) {
            variablesByTemplate[templateName] = [];
          }
          
          if (template.responseTemplate?.joltSpec) {
            template.responseTemplate.joltSpec.forEach(joltOperation => {
              if (joltOperation.operation === 'shift' && joltOperation.spec) {
                // Extract target variable names from JOLT shift operations
                const extractVariableNames = (spec, prefix = '') => {
                  Object.entries(spec).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                      // Extract variable name from target path
                      const varName = value.replace(/\[.*?\]/g, ''); // Remove array indices
                      if (varName && !variables.includes(varName)) {
                        variables.push(varName);
                        if (!variablesByTemplate[templateName].includes(varName)) {
                          variablesByTemplate[templateName].push(varName);
                        }
                      }
                    } else if (typeof value === 'object' && value !== null) {
                      extractVariableNames(value, prefix);
                    }
                  });
                };
                extractVariableNames(joltOperation.spec);
              }
            });
          }
          
          // NEW: Extract field names from stored API response
          if (template.responseTemplate?.responseMapping?.rawResponse) {
            try {
              const apiResponse = JSON.parse(template.responseTemplate.responseMapping.rawResponse);
              
              console.log(`📋 Found API response data in template: ${templateName}`);
              console.log('📋 API Response:', apiResponse);
              
              // Function to extract all field names from API response structure
              const extractFieldNames = (obj, prefix = '') => {
                if (Array.isArray(obj)) {
                  // For arrays, analyze the first item to get field structure
                  if (obj.length > 0 && typeof obj[0] === 'object') {
                    extractFieldNames(obj[0], prefix);
                  }
                } else if (obj && typeof obj === 'object') {
                  Object.keys(obj).forEach(key => {
                    const fieldName = prefix ? `${prefix}.${key}` : key;
                    
                    // Add the field as a selectable option
                    const selectedItemField = `selectedItem.${key}`;
                    if (!variables.includes(selectedItemField)) {
                      variables.push(selectedItemField);
                      if (!variablesByTemplate[templateName].includes(selectedItemField)) {
                        variablesByTemplate[templateName].push(selectedItemField);
                      }
                      console.log(`📋 Added field: ${selectedItemField} (from ${templateName})`);
                    }
                    
                    // For nested objects, extract their fields too
                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                      const nestedKeys = Object.keys(obj[key]);
                      nestedKeys.forEach(nestedKey => {
                        const nestedFieldName = `selectedItem.${key}.${nestedKey}`;
                        if (!variables.includes(nestedFieldName)) {
                          variables.push(nestedFieldName);
                          if (!variablesByTemplate[templateName].includes(nestedFieldName)) {
                            variablesByTemplate[templateName].push(nestedFieldName);
                          }
                          console.log(`📋 Added nested field: ${nestedFieldName} (from ${templateName})`);
                        }
                      });
                    }
                    
                    // IMPORTANT: If this field contains an array, extract fields from array items
                    if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
                      console.log(`📋 Found array field '${key}' with ${obj[key].length} items in ${templateName}, extracting item fields...`);
                      const arrayItem = obj[key][0];
                      Object.keys(arrayItem).forEach(itemKey => {
                        const itemFieldName = `selectedItem.${itemKey}`;
                        if (!variables.includes(itemFieldName)) {
                          variables.push(itemFieldName);
                          if (!variablesByTemplate[templateName].includes(itemFieldName)) {
                            variablesByTemplate[templateName].push(itemFieldName);
                          }
                          console.log(`📋 Added array item field: ${itemFieldName} (from ${templateName}.${key} array)`);
                        }
                        
                        // Handle nested objects within array items
                        if (typeof arrayItem[itemKey] === 'object' && arrayItem[itemKey] !== null && !Array.isArray(arrayItem[itemKey])) {
                          Object.keys(arrayItem[itemKey]).forEach(nestedKey => {
                            const nestedItemFieldName = `selectedItem.${itemKey}.${nestedKey}`;
                            if (!variables.includes(nestedItemFieldName)) {
                              variables.push(nestedItemFieldName);
                              if (!variablesByTemplate[templateName].includes(nestedItemFieldName)) {
                                variablesByTemplate[templateName].push(nestedItemFieldName);
                              }
                              console.log(`📋 Added nested array item field: ${nestedItemFieldName} (from ${templateName}.${key} array)`);
                            }
                          });
                        }
                        
                        // Handle arrays within array items (e.g., genres, availableFormats)
                        if (Array.isArray(arrayItem[itemKey]) && arrayItem[itemKey].length > 0) {
                          // For arrays of primitives, just add the array field itself
                          if (typeof arrayItem[itemKey][0] !== 'object') {
                            console.log(`📋 Found primitive array field: ${itemKey} (from ${templateName}.${key} array)`);
                          } else {
                            // For arrays of objects, extract fields from the first object
                            const nestedArrayItem = arrayItem[itemKey][0];
                            Object.keys(nestedArrayItem).forEach(nestedArrayKey => {
                              const nestedArrayFieldName = `selectedItem.${itemKey}.${nestedArrayKey}`;
                              if (!variables.includes(nestedArrayFieldName)) {
                                variables.push(nestedArrayFieldName);
                                if (!variablesByTemplate[templateName].includes(nestedArrayFieldName)) {
                                  variablesByTemplate[templateName].push(nestedArrayFieldName);
                                }
                                console.log(`📋 Added nested array field: ${nestedArrayFieldName} (from ${templateName}.${key}.${itemKey} array)`);
                              }
                            });
                          }
                        }
                      });
                    }
                  });
                }
              };
              
              // Extract fields from the API response
              extractFieldNames(apiResponse);
              
            } catch (error) {
              console.warn(`Failed to parse API response for field extraction in ${templateName}:`, error);
            }
          } else {
            console.log(`📋 No responseMapping found in template: ${templateName}`);
          }
        });
      }
    });
    
    console.log('getAvailableVariables result:', variables);
    console.log('Variables grouped by template:', variablesByTemplate);
    return { variables, variablesByTemplate };
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
      } else if (selectedNode.data.type === 'DYNAMIC-MENU') {
        // For dynamic menu, get connections from transitions
        const transitions = selectedNode.data.config?.transitions || {};
        Object.entries(transitions).forEach(([key, value]) => {
          if (key !== 'fallback') {
            menuConnections[key] = value;
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
        transactionCodes: selectedNode.data.config?.transactionCodes || ['200', '400', '500'],
        ussdCode: selectedNode.data.config?.ussdCode || '',
        // Dynamic menu specific fields
        dataSource: selectedNode.data.config?.dataSource || {
          type: 'session',
          sessionVariable: '',
          responseKey: 'data',
          nameField: 'name',
          idField: 'id',
          filterField: '',
          filterValue: '',
          sortBy: '',
          sortOrder: 'asc'
        },
        apiConfig: selectedNode.data.config?.apiConfig || {
          endpoint: '',
          method: 'GET',
          headers: {},
          responseKey: 'data',
          nameField: 'name',
          idField: 'id'
        },
        menuMapping: selectedNode.data.config?.menuMapping || {},
        maxMenuItems: selectedNode.data.config?.maxMenuItems || 10,
        routingStrategy: selectedNode.data.config?.routingStrategy || {
          type: 'conditional',
          fixedMapping: {},
          conditionalRules: [],
          singleTarget: '',
          defaultTarget: ''
        }
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
      } else if (selectedNode.data.type === 'DYNAMIC-MENU') {
        updatedConfig.transitions = config.menuConnections;
        updatedConfig.fallback = config.fallback;
        updatedConfig.dataSource = config.dataSource;
        updatedConfig.apiConfig = config.apiConfig;
        updatedConfig.menuMapping = config.menuMapping;
        updatedConfig.routingStrategy = config.routingStrategy;
        updatedConfig.maxMenuItems = config.maxMenuItems;
      } else if (selectedNode.data.type === 'ACTION') {
        updatedConfig.templates = config.templates;
        updatedConfig.transactionCodes = config.transactionCodes;
        // Include dynamic menu fields if they exist
        if (config.templateId) {
          updatedConfig.templateId = config.templateId;
        }
        if (config.sessionSpec) {
          updatedConfig.sessionSpec = config.sessionSpec;
        }
        if (config.menuName) {
          updatedConfig.menuName = config.menuName;
        }
        if (config.menuJolt) {
          updatedConfig.menuJolt = config.menuJolt;
        }
        if (config.isNextMenuDynamic) {
          updatedConfig.isNextMenuDynamic = config.isNextMenuDynamic;
        }
      } else if (selectedNode.data.type === 'START') {
        updatedConfig.ussdCode = config.ussdCode;
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
    // Add template to the list
    const updatedTemplates = [...config.templates, templateData];
    
    // If this template has dynamic menu fields, add them to the Action node config
    const updatedConfig = {
      ...config,
      templates: updatedTemplates
    };
    
    // Transfer dynamic menu fields from template to Action node config
    if (templateData.templateId) {
      updatedConfig.templateId = templateData.templateId;
    }
    if (templateData.sessionSpec) {
      updatedConfig.sessionSpec = templateData.sessionSpec;
    }
    if (templateData.menuName) {
      updatedConfig.menuName = templateData.menuName;
    }
    if (templateData.menuJolt) {
      updatedConfig.menuJolt = templateData.menuJolt;
    }
    if (templateData.isNextMenuDynamic) {
      updatedConfig.isNextMenuDynamic = templateData.isNextMenuDynamic;
    }
    
    setConfig(updatedConfig);
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

        {selectedNode.data.type === 'START' && (
          <>
            <div className="config-section">
              <label>USSD Code / Trigger:</label>
              <input
                type="text"
                value={config.ussdCode || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, ussdCode: e.target.value }))}
                placeholder="e.g., *123# or leave empty for default"
              />
              <small className="config-hint">
                This USSD code will be used as the transition key. Leave empty for default behavior.
              </small>
            </div>
          </>
        )}

        {selectedNode.data.type === 'DYNAMIC-MENU' && (
          <>
            {/* Simplified Dynamic Menu - Routing handled by backend */}
            <div className="config-section">
              <div className="section-header">
                <label>📱 Dynamic Menu Node</label>
              </div>
              <div className="info-box">
                <p>This Dynamic Menu node will automatically generate menu options from session data.</p>
                <p>📋 <strong>Data Source:</strong> Session variables from previous Action nodes</p>
                <p>🎯 <strong>Routing:</strong> Handled dynamically by backend based on user selection</p>
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
          availableVariables={getAvailableVariables().variables}
          availableVariablesByTemplate={getAvailableVariables().variablesByTemplate}
        />
      )}
    </div>
  );
};

export default NodeConfigPanel;
