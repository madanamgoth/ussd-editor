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
            {/* Data Source Configuration */}
            <div className="config-section">
              <div className="section-header">
                <label>📊 Data Source Configuration</label>
              </div>
              <div className="data-source-config">
                <div className="config-row">
                  <label>Data Source Type:</label>
                  <select
                    value={config.dataSource.type}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dataSource: { ...prev.dataSource, type: e.target.value }
                    }))}
                  >
                    <option value="session">Session Variable (from previous Action node)</option>
                    <option value="api">Direct API Call</option>
                  </select>
                </div>
                
                {config.dataSource.type === 'session' && (
                  <>
                    <div className="config-row">
                      <label>Session Variable Name:</label>
                      <input
                        type="text"
                        value={config.dataSource.sessionVariable}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dataSource: { ...prev.dataSource, sessionVariable: e.target.value }
                        }))}
                        placeholder="e.g., billerListResponse, actionNodeResult"
                      />
                      <small className="config-hint">
                        Variable name where the previous Action node stored the API response
                      </small>
                    </div>
                    
                    <div className="config-row">
                      <label>Data Path in Session Variable:</label>
                      <input
                        type="text"
                        value={config.dataSource.responseKey}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dataSource: { ...prev.dataSource, responseKey: e.target.value }
                        }))}
                        placeholder="data or result.items"
                      />
                      <small className="config-hint">
                        Path to the array within the session variable (e.g., "data" if response is {`{data: [...]}`})
                      </small>
                    </div>
                    
                    <div className="config-row">
                      <label>Name Field:</label>
                      <input
                        type="text"
                        value={config.dataSource.nameField}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dataSource: { ...prev.dataSource, nameField: e.target.value }
                        }))}
                        placeholder="name or title"
                      />
                    </div>
                    
                    <div className="config-row">
                      <label>ID Field:</label>
                      <input
                        type="text"
                        value={config.dataSource.idField}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dataSource: { ...prev.dataSource, idField: e.target.value }
                        }))}
                        placeholder="id or code"
                      />
                    </div>
                    
                    {/* Advanced Parsing Options */}
                    <div className="advanced-options">
                      <h4>🔧 Advanced Options</h4>
                      
                      <div className="config-row">
                        <label>Filter Field (optional):</label>
                        <input
                          type="text"
                          value={config.dataSource.filterField}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dataSource: { ...prev.dataSource, filterField: e.target.value }
                          }))}
                          placeholder="status, type, active"
                        />
                      </div>
                      
                      <div className="config-row">
                        <label>Filter Value (optional):</label>
                        <input
                          type="text"
                          value={config.dataSource.filterValue}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dataSource: { ...prev.dataSource, filterValue: e.target.value }
                          }))}
                          placeholder="active, enabled, true"
                        />
                      </div>
                      
                      <div className="config-row">
                        <label>Sort By (optional):</label>
                        <input
                          type="text"
                          value={config.dataSource.sortBy}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dataSource: { ...prev.dataSource, sortBy: e.target.value }
                          }))}
                          placeholder="name, priority, order"
                        />
                      </div>
                      
                      <div className="config-row">
                        <label>Sort Order:</label>
                        <select
                          value={config.dataSource.sortOrder}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dataSource: { ...prev.dataSource, sortOrder: e.target.value }
                          }))}
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
                
                {config.dataSource.type === 'api' && (
                  <>
                    <div className="config-row">
                      <label>Method:</label>
                      <select
                        value={config.apiConfig.method}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          apiConfig: { ...prev.apiConfig, method: e.target.value }
                        }))}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    
                    <div className="config-row">
                      <label>API Endpoint:</label>
                      <input
                        type="text"
                        value={config.apiConfig.endpoint}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          apiConfig: { ...prev.apiConfig, endpoint: e.target.value }
                        }))}
                        placeholder="https://api.example.com/billers"
                      />
                    </div>
                    
                    <div className="config-row">
                      <label>Response Key (path to array):</label>
                      <input
                        type="text"
                        value={config.apiConfig.responseKey}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          apiConfig: { ...prev.apiConfig, responseKey: e.target.value }
                        }))}
                        placeholder="data or result.items"
                      />
                    </div>
                    
                    <div className="config-row">
                      <label>Name Field:</label>
                      <input
                        type="text"
                        value={config.apiConfig.nameField}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          apiConfig: { ...prev.apiConfig, nameField: e.target.value }
                        }))}
                        placeholder="name or title"
                      />
                    </div>
                    
                    <div className="config-row">
                      <label>ID Field:</label>
                      <input
                        type="text"
                        value={config.apiConfig.idField}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          apiConfig: { ...prev.apiConfig, idField: e.target.value }
                        }))}
                        placeholder="id or code"
                      />
                    </div>
                  </>
                )}
                
                <div className="config-row">
                  <label>Max Menu Items:</label>
                  <input
                    type="number"
                    value={config.maxMenuItems}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxMenuItems: parseInt(e.target.value) || 10 }))}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
            </div>
            
            {/* Routing Strategy Section */}
            <div className="config-section">
              <div className="section-header">
                <label>🎯 Dynamic Routing Strategy</label>
              </div>
              <div className="routing-strategy-config">
                <p className="strategy-explanation">
                  Configure how dynamic menu options connect to next nodes when the number of options can change.
                  <br/><br/>
                  <strong>Examples:</strong><br/>
                  • <strong>Single Target:</strong> All billers → Amount Input<br/>
                  • <strong>Conditional:</strong> Mobile Money → Phone Input, Utilities → Account Input<br/>
                  • <strong>Fixed:</strong> Option 1 → Premium Flow, Options 2-4 → Standard Flow
                </p>
                
                <div className="config-row">
                  <label>Routing Type:</label>
                  <select
                    value={config.routingStrategy.type}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      routingStrategy: { ...prev.routingStrategy, type: e.target.value }
                    }))}
                  >
                    <option value="single">Single Target - All options go to same node</option>
                    <option value="conditional">Conditional - Route based on item properties</option>
                    <option value="fixed">Fixed Mapping - Predefined option numbers</option>
                  </select>
                </div>
                
                {config.routingStrategy.type === 'single' && (
                  <div className="config-row">
                    <label>Target Node:</label>
                    <input
                      type="text"
                      value={config.routingStrategy.singleTarget}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        routingStrategy: { ...prev.routingStrategy, singleTarget: e.target.value }
                      }))}
                      placeholder="node_id_for_all_options"
                    />
                    <small className="config-hint">
                      All menu selections will go to this node. Selected item data will be stored in session.
                    </small>
                  </div>
                )}
                
                {config.routingStrategy.type === 'conditional' && (
                  <div className="conditional-rules">
                    <label>Conditional Rules:</label>
                    <div className="examples-hint">
                      <strong>Example conditions:</strong><br/>
                      • <code>item.type === 'mobile_money'</code><br/>
                      • <code>item.requiresAccount === true</code><br/>
                      • <code>item.category === 'utility'</code><br/>
                      • <code>item.fee &gt; 0</code>
                    </div>
                    {config.routingStrategy.conditionalRules.map((rule, index) => (
                      <div key={index} className="rule-item">
                        <div className="rule-inputs">
                          <input
                            type="text"
                            value={rule.condition}
                            onChange={(e) => {
                              const newRules = [...config.routingStrategy.conditionalRules];
                              newRules[index].condition = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                routingStrategy: { ...prev.routingStrategy, conditionalRules: newRules }
                              }));
                            }}
                            placeholder="item.type === 'mobile_money'"
                          />
                          <input
                            type="text"
                            value={rule.targetNode}
                            onChange={(e) => {
                              const newRules = [...config.routingStrategy.conditionalRules];
                              newRules[index].targetNode = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                routingStrategy: { ...prev.routingStrategy, conditionalRules: newRules }
                              }));
                            }}
                            placeholder="target_node_id"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newRules = config.routingStrategy.conditionalRules.filter((_, i) => i !== index);
                            setConfig(prev => ({
                              ...prev,
                              routingStrategy: { ...prev.routingStrategy, conditionalRules: newRules }
                            }));
                          }}
                          className="remove-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newRules = [...config.routingStrategy.conditionalRules, { condition: '', targetNode: '' }];
                        setConfig(prev => ({
                          ...prev,
                          routingStrategy: { ...prev.routingStrategy, conditionalRules: newRules }
                        }));
                      }}
                      className="add-btn"
                    >
                      ➕ Add Rule
                    </button>
                    
                    <div className="config-row">
                      <label>Default Target (when no rules match):</label>
                      <input
                        type="text"
                        value={config.routingStrategy.defaultTarget}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          routingStrategy: { ...prev.routingStrategy, defaultTarget: e.target.value }
                        }))}
                        placeholder="default_node_id"
                      />
                    </div>
                  </div>
                )}
                
                {config.routingStrategy.type === 'fixed' && (
                  <div className="fixed-mapping">
                    <label>Fixed Option Mapping:</label>
                    <p className="mapping-explanation">
                      Define where each option number should route. Unused numbers will use fallback.
                    </p>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(optionNum => (
                      <div key={optionNum} className="mapping-item">
                        <label>Option {optionNum}:</label>
                        <input
                          type="text"
                          value={config.routingStrategy.fixedMapping[optionNum] || ''}
                          onChange={(e) => {
                            const newMapping = { ...config.routingStrategy.fixedMapping };
                            if (e.target.value) {
                              newMapping[optionNum] = e.target.value;
                            } else {
                              delete newMapping[optionNum];
                            }
                            setConfig(prev => ({
                              ...prev,
                              routingStrategy: { ...prev.routingStrategy, fixedMapping: newMapping }
                            }));
                          }}
                          placeholder="target_node_id"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Menu Mapping Section - Legacy */}
            <div className="config-section legacy-section">
              <div className="section-header">
                <label>🔀 Legacy Menu Option Mapping</label>
                <small>(Use Routing Strategy above instead)</small>
                <button
                  type="button"
                  onClick={() => {
                    const newOption = Object.keys(config.menuMapping).length + 1;
                    setConfig(prev => ({
                      ...prev,
                      menuMapping: { ...prev.menuMapping, [newOption]: '' }
                    }));
                  }}
                  className="add-btn"
                >
                  ➕ Add Option
                </button>
              </div>
              <div className="menu-mapping-config">
                <p className="mapping-explanation">
                  Configure where each dynamic menu option should connect to based on user selection.
                </p>
                {Object.entries(config.menuMapping).map(([option, nodeId]) => (
                  <div key={option} className="mapping-item">
                    <label>Option {option}:</label>
                    <input
                      type="text"
                      value={nodeId}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        menuMapping: { ...prev.menuMapping, [option]: e.target.value }
                      }))}
                      placeholder="Target node ID"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newMapping = { ...config.menuMapping };
                        delete newMapping[option];
                        setConfig(prev => ({ ...prev, menuMapping: newMapping }));
                      }}
                      className="remove-btn"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {Object.keys(config.menuMapping).length === 0 && (
                  <p className="no-mapping">No menu mappings configured. Add options above.</p>
                )}
              </div>
            </div>
            
            <div className="config-section">
              <label>Fallback Node ID:</label>
              <input
                type="text"
                value={config.fallback}
                onChange={(e) => setConfig(prev => ({ ...prev, fallback: e.target.value }))}
                placeholder="Enter fallback node ID for invalid selections"
              />
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
