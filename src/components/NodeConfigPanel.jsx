import React, { useState, useEffect } from 'react';
import TemplateCreator from './TemplateCreator';

const NodeConfigPanel = ({ selectedNode, onUpdateNode, onClose, allNodes = [] }) => {
  
  // Utility function to generate SQL query for conditional routing (NiFi Apache Calcite)
  const generateQueryRecord = (responseCode) => {
    if (!responseCode.conditions || responseCode.conditions.length === 0) {
      return "-- No conditions defined\n-- Add conditions to generate NiFi Apache Calcite query";
    }
    
    const conditions = responseCode.conditions.filter(c => c.name && c.query);
    
    if (conditions.length === 0) {
      return "-- No valid conditions defined\n-- Each condition should have a complete WHEN clause";
    }
    
    // Generate CASE statement for each condition
    // Admin inputs complete WHEN clause: "WHEN httpCode = 200 AND userStatus = 'SUB'" 
    // We add the THEN part: "WHEN httpCode = 200 AND userStatus = 'SUB' THEN 'condition1'"
    const caseStatements = conditions.map(condition => 
      `      ${condition.query} THEN '${condition.name}'`
    ).join('\n');
    
    const query = `SELECT *,
  TRIM(
    CASE 
${caseStatements}
      ELSE 'NoMatch'
    END
  ) AS matchedPath
FROM FLOWFILE`;
    
    return query;
  };
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
    transactionCodes: ['200', '400', '500'], // Legacy support
    responseCodes: [ // New enhanced structure
      { code: '200', isResponseParsingEnabled: false, conditions: [] },
      { code: '400', isResponseParsingEnabled: false, conditions: [] },
      { code: '500', isResponseParsingEnabled: false, conditions: [] }
    ],
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
  const [showFullScreenConfig, setShowFullScreenConfig] = useState(false);

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
        transactionCodes: selectedNode.data.config?.transactionCodes || ['200', '400', '500'], // Legacy support
        responseCodes: selectedNode.data.config?.responseCodes || [
          // If no responseCodes exist, create from legacy transactionCodes
          ...(selectedNode.data.config?.transactionCodes || ['200', '400', '500']).map(code => ({
            code,
            isResponseParsingEnabled: false,
            conditions: []
          }))
        ],
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
        <div className="header-buttons">
          {selectedNode.data.type === 'ACTION' && (
            <button 
              onClick={() => setShowFullScreenConfig(true)} 
              className="fullscreen-config-btn"
              title="Open full-screen configuration"
            >
              🔳
            </button>
          )}
          <button onClick={onClose} className="close-config-btn">×</button>
        </div>
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

            {/* Enhanced Response Codes Section with Conditional Parsing */}
            <div className="config-section">
              <div className="section-header">
                <label>🔄 Response Codes & Conditional Parsing</label>
              </div>
              <div className="response-codes-config">
                <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                  Define HTTP response codes and optional conditional parsing for advanced flow control
                </p>
                
                {config.responseCodes?.map((responseCode, index) => (
                  <div key={index} className="response-code-section" style={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '1rem', 
                    marginBottom: '1rem' 
                  }}>
                    {/* Response Code Header */}
                    <div className="response-code-header" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      marginBottom: '1rem' 
                    }}>
                      <span style={{ 
                        fontSize: '1.2rem',
                        color: responseCode.code?.startsWith('2') ? '#10b981' : 
                               responseCode.code?.startsWith('4') ? '#f59e0b' : '#ef4444'
                      }}>
                        {responseCode.code?.startsWith('2') ? '✅' : 
                         responseCode.code?.startsWith('4') ? '⚠️' : '❌'}
                      </span>
                      <input
                        type="text"
                        value={responseCode.code || ''}
                        onChange={(e) => {
                          // Only allow editing if this is not a default response code
                          const isDefault = ['200', '400', '500'].includes(responseCode.code);
                          if (!isDefault) {
                            const newCodes = [...(config.responseCodes || [])];
                            newCodes[index] = { ...newCodes[index], code: e.target.value };
                            setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                          }
                        }}
                        readOnly={['200', '400', '500'].includes(responseCode.code)}
                        className={['200', '400', '500'].includes(responseCode.code) ? 'readonly-input' : ''}
                        placeholder="e.g., 200, 400, 500"
                        style={{ 
                          width: '100px',
                          backgroundColor: ['200', '400', '500'].includes(responseCode.code) ? '#f3f4f6' : 'white',
                          color: ['200', '400', '500'].includes(responseCode.code) ? '#6b7280' : 'inherit'
                        }}
                        title={['200', '400', '500'].includes(responseCode.code) ? 'Default response code (non-editable)' : 'Custom response code'}
                      />
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        HTTP Response Code
                      </span>
                      {!['200', '400', '500'].includes(responseCode.code) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newCodes = (config.responseCodes || []).filter((_, i) => i !== index);
                            setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                          }}
                          className="remove-btn"
                          title="Remove custom response code"
                          style={{ marginLeft: 'auto' }}
                        >
                          🗑️
                        </button>
                      )}
                      {['200', '400', '500'].includes(responseCode.code) && (
                        <span style={{ 
                          marginLeft: 'auto', 
                          fontSize: '0.75rem', 
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          Default
                        </span>
                      )}
                    </div>

                    {/* Conditional Parsing Toggle - Only for 200 and 400 codes */}
                    {(responseCode.code?.startsWith('2') || responseCode.code?.startsWith('4')) && (
                      <div className="conditional-parsing-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <input
                            type="checkbox"
                            id={`parsing-enabled-${index}`}
                            checked={responseCode.isResponseParsingEnabled || false}
                            onChange={(e) => {
                              const newCodes = [...(config.responseCodes || [])];
                              newCodes[index] = { 
                                ...newCodes[index], 
                                isResponseParsingEnabled: e.target.checked,
                                conditions: e.target.checked ? (newCodes[index].conditions || []) : []
                              };
                              setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                            }}
                          />
                          <label htmlFor={`parsing-enabled-${index}`} style={{ fontWeight: '500' }}>
                            🔍 Enable Response Parsing & Conditional Routing
                          </label>
                        </div>
                        
                        {/* Conditional Rules */}
                        {responseCode.isResponseParsingEnabled && (
                          <div className="conditions-section" style={{ 
                            backgroundColor: '#f9fafb', 
                            padding: '1rem', 
                            borderRadius: '6px',
                            marginTop: '0.5rem'
                          }}>
                            <div style={{ marginBottom: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              📝 <strong>How it works:</strong> Admin inputs SQL condition fragments (e.g., "userStatus = 'SUB'").
                              <br />
                              🔗 During export, all conditions will be combined into a single CASE statement:
                              <br />
                              📋 Example: WHEN httpCode = {responseCode.code} AND userStatus = 'SUB' THEN 'condition1'
                              <br />
                              🎯 <strong>Note:</strong> Condition names (condition1, condition2, etc.) are auto-generated and will be used as path names.
                            </div>
                            
                            {(responseCode.conditions || []).map((condition, condIndex) => (
                              <div key={condIndex} className="condition-item" style={{ 
                                display: 'flex', 
                                gap: '0.5rem', 
                                marginBottom: '0.5rem',
                                alignItems: 'center'
                              }}>
                                <input
                                  type="text"
                                  value={`condition${condIndex + 1}`}
                                  readOnly
                                  className="readonly-input"
                                  style={{ width: '120px', backgroundColor: '#f3f4f6', color: '#6b7280' }}
                                  title="Condition name (auto-generated)"
                                />
                                <span style={{ color: '#6b7280' }}>:</span>
                                <input
                                  type="text"
                                  value={condition.query || ''}
                                  onChange={(e) => {
                                    const newCodes = [...(config.responseCodes || [])];
                                    const newConditions = [...(newCodes[index].conditions || [])];
                                    // Auto-update the condition name when query changes
                                    newConditions[condIndex] = { 
                                      ...newConditions[condIndex], 
                                      query: e.target.value,
                                      name: `condition${condIndex + 1}`
                                    };
                                    newCodes[index] = { ...newCodes[index], conditions: newConditions };
                                    setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                  }}
                                  placeholder="WHEN httpCode = 200 AND userStatus = 'SUB'"
                                  className="sql-condition-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCodes = [...(config.responseCodes || [])];
                                    let newConditions = (newCodes[index].conditions || []).filter((_, i) => i !== condIndex);
                                    // Re-number the remaining conditions
                                    newConditions = newConditions.map((cond, i) => ({
                                      ...cond,
                                      name: `condition${i + 1}`
                                    }));
                                    newCodes[index] = { ...newCodes[index], conditions: newConditions };
                                    setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                  }}
                                  className="remove-btn"
                                  title="Remove condition"
                                >
                                  ❌
                                </button>
                              </div>
                            ))}
                            
                            {/* Add Condition Button */}
                            {(!responseCode.conditions || responseCode.conditions.length < 5) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newCodes = [...(config.responseCodes || [])];
                                  const currentConditions = newCodes[index].conditions || [];
                                  const newConditionName = `condition${currentConditions.length + 1}`;
                                  newCodes[index] = { 
                                    ...newCodes[index], 
                                    conditions: [...currentConditions, { name: newConditionName, query: '' }]
                                  };
                                  setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                }}
                                className="add-btn"
                                style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                              >
                                ➕ Add Condition (Max 5)
                              </button>
                            )}
                            
                            {/* Generated Query Preview */}
                            {responseCode.conditions && responseCode.conditions.length > 0 && (
                              <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                                  🔍 Generated NiFi Query:
                                </div>
                                <textarea
                                  readOnly
                                  value={generateQueryRecord(responseCode)}
                                  style={{
                                    width: '100%',
                                    height: '100px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    resize: 'vertical'
                                  }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  📊 <strong>NiFi Apache Calcite Query:</strong> This query will be used for conditional routing in NiFi
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Direct Connection Note for 500 codes */}
                    {responseCode.code?.startsWith('5') && (
                      <div style={{ 
                        backgroundColor: '#fef3c7', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        color: '#92400e'
                      }}>
                        🔗 Server error codes (5xx) use direct connection - no conditional parsing available
                      </div>
                    )}
                  </div>
                )) || []}
                
                {/* Add Response Code Button */}
                <button
                  type="button"
                  onClick={() => {
                    const newCode = {
                      code: '',
                      isResponseParsingEnabled: false,
                      conditions: []
                    };
                    setConfig(prev => ({
                      ...prev,
                      responseCodes: [...(prev.responseCodes || []), newCode]
                    }));
                  }}
                  className="add-btn"
                >
                  ➕ Add Custom Response Code
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

      {/* Full-Screen Action Node Configuration Modal */}
      {showFullScreenConfig && selectedNode.data.type === 'ACTION' && (
        <div className="fullscreen-modal-overlay">
          <div className="fullscreen-modal">
            <div className="fullscreen-modal-header">
              <h2>🔧 Action Node Configuration - {config.id}</h2>
              <button 
                onClick={() => setShowFullScreenConfig(false)} 
                className="fullscreen-close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="fullscreen-modal-content">
              <div className="fullscreen-config-single">
                {/* Basic Configuration Section */}
                <div className="config-section-group">
                  <h3>📋 Basic Configuration</h3>
                  
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
                    <textarea
                      value={config.description || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter a descriptive name for this action node..."
                      rows="2"
                    />
                  </div>
                </div>

                {/* API Templates Section */}
                <div className="config-section-group">
                  <div className="section-header">
                    <h3>🔗 API Templates</h3>
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
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {config.templates.length === 0 && (
                      <div className="no-templates">
                        No templates configured. Click "Add Template" to create one.
                      </div>
                    )}
                  </div>
                </div>

                {/* Response Codes & Conditional Routing Section */}
                <div className="config-section-group">
                  <h3>🔀 Response Codes & Conditional Routing</h3>
                  
                  <div className="response-codes-section">
                    {(config.responseCodes || []).map((responseCode, index) => (
                      <div key={index} className="response-code-config" style={{ 
                        marginBottom: '2rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '1.5rem'
                      }}>
                        <div className="response-code-header" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <input
                            type="text"
                            value={responseCode.code || ''}
                            onChange={(e) => {
                              // Only allow editing if this is not a default response code
                              const isDefault = ['200', '400', '500'].includes(responseCode.code);
                              if (!isDefault) {
                                const newCodes = [...(config.responseCodes || [])];
                                newCodes[index] = { ...newCodes[index], code: e.target.value };
                                setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                              }
                            }}
                            readOnly={['200', '400', '500'].includes(responseCode.code)}
                            className={['200', '400', '500'].includes(responseCode.code) ? 'readonly-input' : ''}
                            placeholder="200"
                            style={{ 
                              width: '80px',
                              backgroundColor: ['200', '400', '500'].includes(responseCode.code) ? '#f3f4f6' : 'white',
                              color: ['200', '400', '500'].includes(responseCode.code) ? '#6b7280' : 'inherit'
                            }}
                            title={['200', '400', '500'].includes(responseCode.code) ? 'Default response code (non-editable)' : 'Custom response code'}
                          />
                          <span style={{ fontWeight: '500' }}>HTTP Response Code</span>
                          {!['200', '400', '500'].includes(responseCode.code) && (
                            <button
                              type="button"
                              onClick={() => {
                                const newCodes = (config.responseCodes || []).filter((_, i) => i !== index);
                                setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                              }}
                              className="remove-btn"
                              style={{ marginLeft: 'auto' }}
                              title="Remove custom response code"
                            >
                              🗑️
                            </button>
                          )}
                          {['200', '400', '500'].includes(responseCode.code) && (
                            <span style={{ 
                              marginLeft: 'auto', 
                              fontSize: '0.75rem', 
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              Default
                            </span>
                          )}
                        </div>

                        {/* Conditional Parsing Toggle - Only for 200 and 400 codes */}
                        {(responseCode.code?.startsWith('2') || responseCode.code?.startsWith('4')) && (
                          <div className="conditional-parsing-section">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                              <input
                                type="checkbox"
                                id={`fullscreen-parsing-enabled-${index}`}
                                checked={responseCode.isResponseParsingEnabled || false}
                                onChange={(e) => {
                                  const newCodes = [...(config.responseCodes || [])];
                                  newCodes[index] = { 
                                    ...newCodes[index], 
                                    isResponseParsingEnabled: e.target.checked,
                                    conditions: e.target.checked ? (newCodes[index].conditions || []) : []
                                  };
                                  setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                }}
                              />
                              <label htmlFor={`fullscreen-parsing-enabled-${index}`} style={{ fontWeight: '500' }}>
                                🔍 Enable Response Parsing & Conditional Routing
                              </label>
                            </div>
                            
                            {/* Conditional Rules */}
                            {responseCode.isResponseParsingEnabled && (
                              <div className="conditions-section" style={{ 
                                backgroundColor: '#f9fafb', 
                                padding: '1.5rem', 
                                borderRadius: '6px',
                                marginTop: '0.5rem'
                              }}>
                                {(responseCode.conditions || []).map((condition, condIndex) => (
                                  <div key={condIndex} className="condition-item" style={{ 
                                    display: 'flex', 
                                    gap: '0.5rem', 
                                    marginBottom: '1rem',
                                    alignItems: 'center'
                                  }}>
                                    <input
                                      type="text"
                                      value={`condition${condIndex + 1}`}
                                      readOnly
                                      className="readonly-input"
                                      style={{ width: '150px', backgroundColor: '#f3f4f6', color: '#6b7280' }}
                                      title="Condition name (auto-generated)"
                                    />
                                    <span style={{ color: '#6b7280' }}>:</span>
                                    <input
                                      type="text"
                                      value={condition.query || ''}
                                      onChange={(e) => {
                                        const newCodes = [...(config.responseCodes || [])];
                                        const newConditions = [...(newCodes[index].conditions || [])];
                                        // Auto-update the condition name when query changes
                                        newConditions[condIndex] = { 
                                          ...newConditions[condIndex], 
                                          query: e.target.value,
                                          name: `condition${condIndex + 1}`
                                        };
                                        newCodes[index] = { ...newCodes[index], conditions: newConditions };
                                        setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                      }}
                                      placeholder="WHEN httpCode = 200 AND userStatus = 'SUB'"
                                      className="sql-condition-input"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newCodes = [...(config.responseCodes || [])];
                                        let newConditions = (newCodes[index].conditions || []).filter((_, i) => i !== condIndex);
                                        // Re-number the remaining conditions
                                        newConditions = newConditions.map((cond, i) => ({
                                          ...cond,
                                          name: `condition${i + 1}`
                                        }));
                                        newCodes[index] = { ...newCodes[index], conditions: newConditions };
                                        setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                      }}
                                      className="remove-btn"
                                      title="Remove condition"
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ))}
                                
                                {/* Add Condition Button */}
                                {(!responseCode.conditions || responseCode.conditions.length < 5) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newCodes = [...(config.responseCodes || [])];
                                      const currentConditions = newCodes[index].conditions || [];
                                      const newConditionName = `condition${currentConditions.length + 1}`;
                                      newCodes[index] = { 
                                        ...newCodes[index], 
                                        conditions: [...currentConditions, { name: newConditionName, query: '' }]
                                      };
                                      setConfig(prev => ({ ...prev, responseCodes: newCodes }));
                                    }}
                                    className="add-condition-btn"
                                    style={{ marginTop: '0.5rem' }}
                                  >
                                    ➕ Add Condition ({(responseCode.conditions || []).length}/5)
                                  </button>
                                )}

                                {/* Generated Query Preview */}
                                <div className="query-preview" style={{ marginTop: '1rem' }}>
                                  <label style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                                    🔍 Generated NiFi Query:
                                  </label>
                                  <textarea
                                    readOnly
                                    value={generateQueryRecord(responseCode)}
                                    rows="8"
                                    style={{ 
                                      width: '100%', 
                                      fontFamily: 'monospace', 
                                      fontSize: '12px',
                                      backgroundColor: '#f3f4f6',
                                      color: '#374151'
                                    }}
                                  />
                                  <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
                                    📊 <strong>NiFi Apache Calcite Query:</strong> This query will be used for conditional routing in NiFi
                                  </small>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Server Error Note */}
                        {responseCode.code?.startsWith('5') && (
                          <div style={{ 
                            backgroundColor: '#fef3c7', 
                            padding: '0.75rem', 
                            borderRadius: '4px', 
                            color: '#92400e',
                            fontSize: '0.875rem'
                          }}>
                            🔗 Server error codes (5xx) use direct connection - no conditional parsing available
                          </div>
                        )}
                      </div>
                    )) || []}
                    
                    {/* Add Response Code Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = {
                          code: '',
                          isResponseParsingEnabled: false,
                          conditions: []
                        };
                        setConfig(prev => ({
                          ...prev,
                          responseCodes: [...(prev.responseCodes || []), newCode]
                        }));
                      }}
                      className="add-btn"
                      style={{ width: '100%', padding: '1rem' }}
                    >
                      ➕ Add Custom Response Code
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="fullscreen-modal-footer">
              <button onClick={handleSave} className="save-btn">
                💾 Save Changes
              </button>
              <button onClick={() => setShowFullScreenConfig(false)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeConfigPanel;
