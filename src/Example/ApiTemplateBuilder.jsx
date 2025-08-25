import React, { useState, useEffect } from 'react';
import './ApiTemplateBuilder.css';
import './ApiTemplateBuilderEnhanced.css';
import './TemplateManager.css';
import { 
  generateResponseJolt, 
  generateErrorJolt, 
  validateJoltSpec,
  autoDetectMapping,
  hasNestedPath,
  setNestedValue 
} from '../utils/JoltGeneratorEnhanced.js';
import {
  downloadTemplate,
  autoSaveTemplate,
  loadTemplateFromFile
} from '../utils/TemplateManager.js';

const ApiTemplateBuilder = ({ isOpen, onClose, onSave, existingTemplate = null }) => {
  const [step, setStep] = useState(1);
  const [templateData, setTemplateData] = useState({
    _id: '',
    target: {
      endpoint: '',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    requestTemplate: { joltSpec: [] },
    responseTemplate: { joltSpec: [] },
    responseErrorTemplate: { joltSpec: [] }
  });

  const [curlInput, setCurlInput] = useState('');
  const [parsedRequest, setParsedRequest] = useState({});
  const [requestMapping, setRequestMapping] = useState([]);
  const [responseMapping, setResponseMapping] = useState({
    rawResponse: '',
    desiredOutput: '',
    generated: null,
    joltPreview: null,
    joltError: null
  });
  const [errorMapping, setErrorMapping] = useState({
    rawError: '',
    desiredError: '',
    generated: null,
    joltPreview: null,
    joltError: null
  });
  const [staticFields, setStaticFields] = useState({});

  // Helper functions moved to JoltGenerator utility

  // JOLT validation and preview function - Updated to use new utility
  const validateAndPreviewJolt = async (joltSpec, inputData, mappingType) => {
    const result = validateJoltSpec(joltSpec, inputData, mappingType);
    return { 
      preview: result.result, 
      error: result.error 
    };
  };

  useEffect(() => {
    if (existingTemplate) {
      setTemplateData(existingTemplate);
      setStep(4); // Skip to review if editing existing template
    }
  }, [existingTemplate]);

  // Extract fields from nested object - MOVED BEFORE parseCurlCommand
  const extractFieldsFromObject = (obj, prefix = '', results = []) => {
    console.log('Extracting fields from object:', obj, 'prefix:', prefix); // Debug
    
    if (!obj || typeof obj !== 'object') {
      return results;
    }
    
    Object.keys(obj).forEach(key => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively extract from nested objects (unlimited depth)
        extractFieldsFromObject(value, fullPath, results);
      } else if (Array.isArray(value)) {
        // Handle arrays - extract first element as template
        if (value.length > 0 && typeof value[0] === 'object') {
          extractFieldsFromObject(value[0], `${fullPath}[0]`, results);
        } else {
          // Simple array
          results.push({
            path: fullPath,
            value: JSON.stringify(value),
            type: 'array',
            category: 'body',
            isStatic: false,
            storeAttribute: key, // ✅ PRESERVE ORIGINAL CASE
            targetPath: fullPath
          });
        }
      } else {
        // Leaf field - string, number, boolean, null
        results.push({
          path: fullPath,
          value: value,
          type: typeof value,
          category: 'body',
          isStatic: false, // Default to dynamic for body fields
          storeAttribute: key, // ✅ PRESERVE ORIGINAL CASE - don't convert to lowercase
          targetPath: fullPath
        });
      }
    });
    
    return results;
  };

  // Step 1: Parse cURL command with robust regex parsing
  const parseCurlCommand = () => {
    try {
      console.log('Parsing cURL:', curlInput); // Debug log
      
      // Extract basic information using regex
      let method = 'GET'; // Default method
      let url = '';
      let headers = {};
      let body = {};
      let queryParams = {};
      
      // Parse method - support ALL HTTP methods (RESTful)
      const methodMatch = curlInput.match(/(?:-X|--request)\s+([A-Z]+)/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
        console.log('Found method:', method);
      } else {
        // If no method specified but has data, assume POST
        if (curlInput.includes('--data') || curlInput.includes('-d')) {
          method = 'POST';
        }
      }
      
      // Parse URL - handle various quote formats and --location flag
      const urlMatches = [
        curlInput.match(/curl\s+(?:--location\s+)?['"]([^'"]+)['"]/),
        curlInput.match(/curl\s+(?:--location\s+)?['"]?([^\s'"]+)['"]?/),
        curlInput.match(/(?:--location|curl)\s+['"]([^'"]+)['"]/),
        curlInput.match(/['"]([^'"]*http[^'"]*)['"]/), // Any quoted HTTP URL
        curlInput.match(/(https?:\/\/[^\s'"]+)/), // Any HTTP URL
      ];
      
      for (const match of urlMatches) {
        if (match && match[1] && match[1].startsWith('http')) {
          url = match[1];
          console.log('Found URL:', url);
          break;
        }
      }
      
      if (!url) {
        throw new Error('Could not extract URL from cURL command');
      }
      
      // Parse headers - support UNLIMITED headers (RESTful)
      const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g;
      let headerMatch;
      let headerCount = 0;
      while ((headerMatch = headerRegex.exec(curlInput)) !== null) {
        headers[headerMatch[1].trim()] = headerMatch[2].trim();
        headerCount++;
        console.log(`Found header ${headerCount}:`, headerMatch[1].trim(), '=', headerMatch[2].trim());
      }
      console.log(`Total headers found: ${headerCount}`);
      
      // Parse body - look for -d, --data, or --data-raw flag (support complex JSON)
      const bodyMatches = [
        // Try different quote patterns for --data, --data-raw
        curlInput.match(/(?:-d|--data|--data-raw)\s+['"](.+?)['"]/s),
        curlInput.match(/(?:-d|--data|--data-raw)\s+'([^']+)'/s),
        curlInput.match(/(?:-d|--data|--data-raw)\s+"([^"]+)"/s),
        // Match --data-raw with multi-line JSON (most common in modern cURL)
        curlInput.match(/(?:--data-raw)\s+'([\s\S]*?)'/),
        curlInput.match(/(?:--data-raw)\s+"([\s\S]*?)"/),
        // Try to find JSON block between { and } with any data flag
        curlInput.match(/(?:-d|--data|--data-raw)\s+['"]*(\{[\s\S]*?\})['"]*(?:\s|$)/m),
        // Fallback: any data flag followed by content
        curlInput.match(/(?:-d|--data|--data-raw)\s+(.+?)(?:\s+--|\s*$)/s),
      ];
      
      let bodyMatch = null;
      for (const match of bodyMatches) {
        if (match && match[1] && match[1].trim().length > 2) { // Ensure we got more than just "{ "
          bodyMatch = match;
          console.log('✅ Found body match with pattern', bodyMatches.indexOf(match) + 1);
          console.log('Raw match:', match[1]);
          break;
        } else if (match) {
          console.log('❌ Rejected match (too short):', match[1]);
        }
      }
      
      if (bodyMatch) {
        try {
          // Clean up the body string
          let bodyStr = bodyMatch[1].trim();
          
          console.log('🔧 Original body string length:', bodyStr.length);
          console.log('🔧 First 100 chars:', bodyStr.substring(0, 100));
          console.log('🔧 Last 100 chars:', bodyStr.substring(Math.max(0, bodyStr.length - 100)));
          
          // Remove trailing backslashes and whitespace
          bodyStr = bodyStr.replace(/\s*\\?\s*$/, '');
          
          // Handle escaped quotes
          bodyStr = bodyStr.replace(/\\"/g, '"');
          
          // Remove any trailing commas or line breaks after }
          bodyStr = bodyStr.replace(/\}[\s,]*$/, '}');
          
          console.log('🔧 Cleaned body string length:', bodyStr.length);
          console.log('🔧 Attempting to parse JSON...');
          
          // If it looks like JSON, try to parse it
          if ((bodyStr.startsWith('{') && bodyStr.endsWith('}')) || 
              (bodyStr.startsWith('[') && bodyStr.endsWith(']'))) {
            body = JSON.parse(bodyStr);
            console.log('✅ Successfully parsed JSON body with', Object.keys(body).length, 'root fields:', Object.keys(body).join(', '));
          } else {
            // Try parsing anyway in case quotes were stripped
            try {
              body = JSON.parse(bodyStr);
              console.log('✅ Parsed JSON after cleanup with', Object.keys(body).length, 'root fields:', Object.keys(body).join(', '));
            } catch (secondTry) {
              console.error('❌ Second parse attempt failed:', secondTry.message);
              throw new Error('Not valid JSON format: ' + secondTry.message);
            }
          }
        } catch (e) {
          console.warn('❌ Could not parse body as JSON:', e.message);
          console.warn('❌ Body string was:', bodyMatch[1]);
          
          // Handle form data or other formats
          const bodyStr = bodyMatch[1];
          if (bodyStr.includes('&') && bodyStr.includes('=')) {
            // Form-encoded data
            bodyStr.split('&').forEach(pair => {
              const [key, value] = pair.split('=');
              if (key) body[decodeURIComponent(key)] = decodeURIComponent(value || '');
            });
            console.log('Parsed as form data with', Object.keys(body).length, 'fields');
          } else {
            // Raw data - this is what you're seeing
            body = { rawData: bodyStr };
            console.log('⚠️ Stored as raw data (parsing failed):', bodyStr.substring(0, 100));
          }
        }
      } else {
        console.log('No body data found in cURL command');
      }
      
      // Extract query parameters from URL (RESTful query strings)
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.forEach((value, key) => {
          queryParams[key] = value;
        });
        if (Object.keys(queryParams).length > 0) {
          console.log('Found query parameters:', Object.keys(queryParams).length);
        }
      } catch (urlError) {
        // Manual extraction if URL constructor fails
        console.warn('URL parsing failed, using manual extraction:', urlError);
        const queryStart = url.indexOf('?');
        if (queryStart !== -1) {
          const queryString = url.substring(queryStart + 1);
          const queryPairs = queryString.split('&');
          queryPairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
              queryParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
          });
        }
      }

      const templateId = prompt('Enter Template ID (e.g., PaymentStatus, GetBalance, TransferMoney):');
      if (!templateId) return;

      setTemplateData(prev => ({
        ...prev,
        _id: templateId,
        target: {
          endpoint: url,
          method: method,
          headers
        }
      }));

      // Extract ALL fields systematically (UNLIMITED fields support)
      const allFields = [];
      
      // 1. Extract header fields (unlimited headers)
      Object.keys(headers).forEach(headerName => {
        allFields.push({
          path: `headers.${headerName}`,
          value: headers[headerName],
          type: 'string',
          category: 'header',
          isStatic: true, // Headers often static (API keys, content-type)
          storeAttribute: '',
          targetPath: `headers.${headerName}`
        });
      });
      
      // 2. Extract query parameter fields (RESTful query params)
      Object.keys(queryParams).forEach(paramName => {
        allFields.push({
          path: `queryParams.${paramName}`,
          value: queryParams[paramName],
          type: 'string',
          category: 'query',
          isStatic: false, // Query params often dynamic
          storeAttribute: paramName, // ✅ PRESERVE ORIGINAL CASE
          targetPath: `queryParams.${paramName}`
        });
      });
      
      // 3. Extract body fields recursively (handles complex nested JSON)
      if (Object.keys(body).length > 0) {
        try {
          extractFieldsFromObject(body, '', allFields);
        } catch (extractError) {
          console.warn('⚠️ Error extracting body fields:', extractError);
          // Add raw body as fallback
          allFields.push({
            path: 'rawBody',
            value: JSON.stringify(body),
            type: 'object',
            category: 'body',
            isStatic: false,
            storeAttribute: 'rawbody',
            targetPath: 'rawBody'
          });
        }
      }
      
      console.log(`🎯 EXTRACTION COMPLETE:`);
      console.log(`   📋 Headers: ${Object.keys(headers).length}`);
      console.log(`   🔗 Query Params: ${Object.keys(queryParams).length}`);
      console.log(`   📝 Body Fields: ${allFields.filter(f => f.category === 'body').length}`);
      console.log(`   🔥 Total Fields: ${allFields.length}`);
      
      setRequestMapping(allFields);
      setStep(2);
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      alert('Error parsing cURL command: ' + error.message + '\n\nPlease check your cURL format and try again.');
    }
  };

  // Step 2: Configure request mapping
  const updateRequestField = (index, field, value) => {
    setRequestMapping(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addStaticField = () => {
    const path = prompt('Enter field path (e.g., RequestHeader.APIContext.APIVersion):');
    const value = prompt('Enter static value:');
    if (path && value) {
      setStaticFields(prev => ({ ...prev, [path]: value }));
    }
  };

  // Step 3: Configure response mapping
  const addResponseField = () => {
    const sourcePath = prompt('Enter source path from API response:');
    const targetPath = prompt('Enter target path for USSD flow:');
    if (sourcePath && targetPath) {
      setResponseMapping(prev => [...prev, { sourcePath, targetPath }]);
    }
  };

  const addErrorField = () => {
    const sourcePath = prompt('Enter error source path:');
    const targetPath = prompt('Enter error target path:');
    if (sourcePath && targetPath) {
      setErrorMapping(prev => [...prev, { sourcePath, targetPath }]);
    }
  };

  // Helper functions moved to JoltGenerator utility

  // 🎯 ENHANCED RESPONSE MAPPING GENERATOR - Using JOLT Generator Utility
  const generateResponseMapping = async () => {
    try {
      console.log('🔧 Raw response input:', responseMapping.rawResponse);
      console.log('🔧 Desired output input:', responseMapping.desiredOutput);
      
      const rawResponse = JSON.parse(responseMapping.rawResponse);
      const desiredOutput = JSON.parse(responseMapping.desiredOutput);
      
      console.log('✅ Parsed Raw Response:', rawResponse);
      console.log('✅ Parsed Desired Output:', desiredOutput);
      
      // 🤖 Use Enhanced JOLT Generator
      const result = generateResponseJolt(rawResponse, desiredOutput);
      
      setResponseMapping(prev => ({
        ...prev,
        generated: result.joltSpec,
        joltPreview: result.preview,
        joltError: result.error
      }));
      
    } catch (error) {
      console.error('❌ JSON Parsing Error:', error);
      
      // Provide specific error feedback
      let errorMessage = 'Invalid JSON format. ';
      
      if (error.message.includes('Unexpected token')) {
        errorMessage += 'Check for missing quotes around keys and values. ';
      }
      
      if (responseMapping.rawResponse && !responseMapping.rawResponse.trim().startsWith('{')) {
        errorMessage += 'Expected API Response must start with { ';
      }
      
      if (responseMapping.desiredOutput && !responseMapping.desiredOutput.trim().startsWith('{')) {
        errorMessage += 'Desired USSD Output must start with { ';
      }
      
      errorMessage += '\n\nExample:\n{\n  "PrimaryAcctNo": "accountNumber"\n}';
      
      alert(errorMessage);
    }
  };

  // 🎯 ENHANCED ERROR MAPPING GENERATOR - Using JOLT Generator Utility
  const generateErrorMapping = async () => {
    try {
      const rawError = JSON.parse(errorMapping.rawError);
      const desiredError = JSON.parse(errorMapping.desiredError);
      
      console.log('Raw Error:', rawError);
      console.log('Desired Error:', desiredError);
      
      // 🤖 Use Enhanced JOLT Generator for errors
      const result = generateErrorJolt(rawError, desiredError);
      
      setErrorMapping(prev => ({
        ...prev,
        generated: result.joltSpec,
        joltPreview: result.preview,
        joltError: result.error
      }));
      
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
      console.error('Error mapping error:', error);
    }
  };

  // Helper functions moved to JoltGenerator utility

  // Generate JOLT specifications
  const generateJoltSpecs = () => {
    // Request template with input wrapper
    const requestShiftSpec = {
      input: {}
    };
    const requestDefaultSpec = {};

    // Only include DYNAMIC fields in the input object
    requestMapping.forEach(field => {
      if (!field.isStatic && field.storeAttribute) {
        // Only dynamic fields go to input - PRESERVE EXACT FIELD NAMES
        requestShiftSpec.input[field.storeAttribute] = field.path;
        console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.path}`);
      } else if (field.isStatic && field.category !== 'header') {
        // Static fields go to default spec (but NOT headers - headers go to target.headers)
        setNestedValue(requestDefaultSpec, field.path, field.value);
        console.log(`✅ Static field: ${field.path} = ${field.value}`);
      }
    });

    // Additional static fields
    Object.keys(staticFields).forEach(path => {
      setNestedValue(requestDefaultSpec, path, staticFields[path]);
    });

    const requestJolt = [
      {
        operation: "shift",
        spec: requestShiftSpec
      },
      {
        operation: "default",
        spec: requestDefaultSpec
      }
    ];

    // Use generated response and error mappings with proper defaults
    const responseJolt = responseMapping.generated || [
      {
        operation: "shift",
        spec: {
          input: {}
        }
      },
      {
        operation: "default",
        spec: {
          success: true,
          timestamp: "@(1,timestamp)",
          status: "SUCCEEDED"
        }
      }
    ];

    const errorJolt = errorMapping.generated || [
      {
        operation: "shift",
        spec: {
          input: {}
        }
      },
      {
        operation: "default",
        spec: {
          success: false,
          error: true,
          timestamp: "@(1,timestamp)",
          status: "FAILED",
          errorCode: "UNKNOWN_ERROR",
          errorMessage: "An error occurred"
        }
      }
    ];

    setTemplateData(prev => ({
      ...prev,
      requestTemplate: { joltSpec: requestJolt },
      responseTemplate: { joltSpec: responseJolt },
      responseErrorTemplate: { joltSpec: errorJolt }
    }));

    setStep(4);
  };

  const handleSave = () => {
    // Save through parent component (localStorage)
    onSave(templateData);
    
    // Also auto-save to project folder
    const result = autoSaveTemplate(templateData);
    if (result.success) {
      alert(`✅ Template saved successfully!\n📁 Downloaded to: ${result.filename || 'Downloads folder'}`);
    } else {
      alert(`⚠️ Template saved to browser but download failed: ${result.error}`);
    }
    
    onClose();
  };

  // Download template as file
  const handleDownload = () => {
    const result = downloadTemplate(templateData);
    if (result.success) {
      alert(`✅ Template downloaded: ${result.filename}`);
    } else {
      alert(`❌ Download failed: ${result.error}`);
    }
  };

  // Import template from file
  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const template = await loadTemplateFromFile(file);
        setTemplateData(template);
        setStep(4); // Go to review step
        alert(`✅ Template imported: ${template._id}`);
      } catch (error) {
        alert(`❌ Import failed: ${error.message}`);
      }
    };
    
    input.click();
  };

  const renderStep1 = () => (
    <div className="step-content">
      <h3>Step 1: Parse cURL Command</h3>
      <p>Paste your cURL command to extract API details (supports all RESTful methods & unlimited fields):</p>
      <textarea
        value={curlInput}
        onChange={(e) => setCurlInput(e.target.value)}
        placeholder={`📋 RESTful API Support - Any Method, Any Fields:

🔥 Postman Export (GET/POST/PUT/DELETE/PATCH):
curl --location 'http://api.example.com/users/123' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Bearer token123' \\
--header 'X-Custom-Header: value' \\
--data '{
  "field1": "value1",
  "nested": {
    "field2": "value2",
    "array": [{"item": "value"}]
  }
}'

📋 Terminal Format:
curl -X PUT 'http://api.example.com/endpoint' \\
-H 'Content-Type: application/json' \\
-H 'Authorization: Bearer token' \\
-d '{"any": "fields", "unlimited": "support"}'

✅ Supports: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
✅ Unlimited headers, query params, nested JSON fields
✅ Complex nested objects and arrays`}
        rows={20}
        className="curl-input"
      />
      <button onClick={parseCurlCommand} className="btn primary">
        🚀 Parse cURL Command
      </button>
    </div>
  );

  const renderStep2 = () => {
    console.log('Rendering Step 2, requestMapping:', requestMapping); // Debug log
    
    // Get available store attributes from the current USSD nodes
    const availableAttributes = [
      'pin', 'amount', 'recipient', 'phone', 'accountNumber', 'userInput', 'selection',
      'customerPin', 'requestId', 'bankCode', 'transactionType', 'customerId',
      'merchantReference', 'currencyCode', 'orderNumber', 'customerName', 'customerEmail', 'customerPhone'
    ];
    
    // If no fields were extracted, show helpful message
    if (!requestMapping || requestMapping.length === 0) {
      return (
        <div className="step-content">
          <h3>Step 2: Configure Request Parameters</h3>
          <div className="no-fields-message">
            <h4>❌ No fields extracted from cURL command</h4>
            <p>This could happen if:</p>
            <ul>
              <li>The cURL command format is not recognized</li>
              <li>No request body was found (GET requests)</li>
              <li>Headers or query parameters weren't parsed correctly</li>
            </ul>
            <p><strong>Please go back and check your cURL command format.</strong></p>
            <div className="curl-example">
              <h5>Expected format example:</h5>
              <pre>{`curl -X POST 'http://api.example.com/endpoint' \\
-H 'Content-Type: application/json' \\
-H 'Authorization: Bearer token123' \\
-d '{
  "field1": "value1",
  "field2": "value2"
}'`}</pre>
            </div>
          </div>
          <div className="step-buttons">
            <button onClick={() => setStep(1)} className="btn secondary">← Back to Step 1</button>
          </div>
        </div>
      );
    }
    
    // Group fields by category for better organization
    const fieldsByCategory = requestMapping.reduce((acc, field) => {
      const category = field.category || 'body';
      if (!acc[category]) acc[category] = [];
      acc[category].push(field);
      return acc;
    }, {});

    return (
      <div className="step-content">
        <h3>Step 2: Configure Request Parameters</h3>
        <p>All fields extracted from your cURL command. Select which are static vs dynamic:</p>
        <div className="fields-summary">
          <strong>Total fields found: {requestMapping.length}</strong>
        </div>
        
        {Object.keys(fieldsByCategory).map(category => (
          <div key={category} className="field-category">
            <h4 className="category-title">
              {category === 'header' ? '📋 Headers' : 
               category === 'query' ? '🔗 Query Parameters' : 
               '📝 Request Body'}
            </h4>
            
            <div className="field-mapping">
              {fieldsByCategory[category].map((field, globalIndex) => {
                const index = requestMapping.findIndex(f => f.path === field.path);
                return (
                  <div key={index} className="field-row">
                    <div className="field-info">
                      <strong>{field.path}</strong>
                      <span className="field-type">({field.type})</span>
                      <span className="field-value">= "{field.value}"</span>
                    </div>
                    
                    <div className="field-controls">
                      <div className="radio-group">
                        <label className="radio-label">
                          <input
                            type="radio"
                            name={`field-${index}`}
                            checked={field.isStatic}
                            onChange={() => updateRequestField(index, 'isStatic', true)}
                          />
                          📌 Static
                        </label>
                        
                        <label className="radio-label">
                          <input
                            type="radio"
                            name={`field-${index}`}
                            checked={!field.isStatic}
                            onChange={() => updateRequestField(index, 'isStatic', false)}
                          />
                          🔄 Dynamic
                        </label>
                      </div>
                      
                      {!field.isStatic && (
                        <div className="dynamic-config">
                          <label>Store Attribute:</label>
                          <select
                            value={field.storeAttribute}
                            onChange={(e) => updateRequestField(index, 'storeAttribute', e.target.value)}
                            className="store-attribute-select"
                          >
                            <option value="">Select attribute...</option>
                            {availableAttributes.map(attr => (
                              <option key={attr} value={attr}>{attr}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Or type custom..."
                            value={field.storeAttribute}
                            onChange={(e) => updateRequestField(index, 'storeAttribute', e.target.value)}
                            className="store-attribute-input"
                          />
                        </div>
                      )}
                      
                      {field.isStatic && (
                        <div className="static-config">
                          <label>Static Value:</label>
                          <input
                            type="text"
                            placeholder="Enter static value..."
                            value={field.value}
                            onChange={(e) => updateRequestField(index, 'value', e.target.value)}
                            className="static-value-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="step-buttons">
          <button onClick={() => setStep(1)} className="btn secondary">← Back</button>
          <button onClick={() => setStep(3)} className="btn primary">Next: Response Mapping →</button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="step-content">
        <h3>Step 3: Configure Response & Error Mapping</h3>
        <p>Transform API responses into USSD-friendly format using intelligent mapping:</p>
        
        <div className="response-section">
          <h4>✅ Success Response Transformation</h4>
          <p className="help-text">Paste your expected API response and define how to transform it:</p>
          
          <div className="transformation-guide">
            <div className="guide-section">
              <h5>📝 How to Fill the Response Mapping:</h5>
              <div className="guide-examples">
                <div className="example-item">
                  <span className="example-label">1️⃣ Left Side (API Response):</span>
                  <span className="example-desc">Paste the EXACT JSON response you get from your API</span>
                </div>
                <div className="example-item">
                  <span className="example-label">2️⃣ Right Side (Field Mapping):</span>
                  <span className="example-desc">Map API fields to USSD variables using "source": "target" format</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="json-transformation">
            <div className="json-input-group">
              <label>📥 Expected API Response (JSON):</label>
              <div className="input-help">
                <small>💡 <strong>Tip:</strong> Copy-paste the actual JSON response from your API test/Postman</small>
              </div>
              <textarea
                placeholder={`📋 EXAMPLE - Banking API Response:
{
  "status": "200",
  "GetDebitCardDetailsRes": {
    "ResponseHeader": {
      "APIResponse": {
        "StatusCode": "0000"
      }
    },
    "PrimaryAcctNo": "1234567890",
    "AccountId": "ACC123456", 
    "ResponseCode": "00",
    "CustomerName": "John Doe",
    "AvailableBalance": "5000.00"
  }
}

📋 EXAMPLE - User Profile API:
{
  "success": true,
  "data": {
    "user": {
      "id": "12345",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890"
    },
    "account": {
      "balance": "2500.50",
      "status": "active"
    }
  }
}`}
                rows={12}
                className="json-input"
                value={responseMapping.rawResponse || ''}
                onChange={(e) => setResponseMapping(prev => ({...prev, rawResponse: e.target.value}))}
              />
            </div>
            
            <div className="arrow-transform">
              <span>🔄</span>
              <small>Transform</small>
            </div>
            
            <div className="json-input-group">
              <label>📤 Field Mapping (source → target):</label>
              <div className="input-help">
                <small>💡 <strong>Format:</strong> "API.field.path": "ussd_variable_name"</small>
              </div>
              <textarea
                placeholder={`📋 MAPPING FORMAT - Banking Example:
{
  "GetDebitCardDetailsRes.PrimaryAcctNo": "accountNumber",
  "GetDebitCardDetailsRes.ResponseCode": "statusCode", 
  "GetDebitCardDetailsRes.AccountId": "accountId",
  "GetDebitCardDetailsRes.CustomerName": "customerName",
  "GetDebitCardDetailsRes.AvailableBalance": "balance",
  "status": "httpStatus"
}

📋 GENERATED JOLT SPEC WILL BE:
{
  "operation": "shift",
  "spec": {
    "input": {
      "GetDebitCardDetailsRes": {
        "PrimaryAcctNo": "accountNumber",
        "ResponseCode": "statusCode",
        "AccountId": "accountId",
        "CustomerName": "customerName",
        "AvailableBalance": "balance"
      },
      "status": "httpStatus"
    }
  }
},
{
  "operation": "default",
  "spec": {
    "success": true,
    "timestamp": "@(1,timestamp)",
    "status": "SUCCEEDED"
  }
}

⚠️ IMPORTANT RULES:
✅ LEFT side = API response path (use dots for nested fields)
✅ RIGHT side = Your USSD variable name (simple names)
❌ Don't reverse it: "userId": "data.user.id" is WRONG`}
                rows={12}
                className="json-input"
                value={responseMapping.desiredOutput || ''}
                onChange={(e) => setResponseMapping(prev => ({...prev, desiredOutput: e.target.value}))}
              />
            </div>
          </div>
          
          <button 
            onClick={generateResponseMapping}
            className="btn primary"
            disabled={!responseMapping.rawResponse || !responseMapping.desiredOutput}
          >
            🔄 Generate Response JOLT Spec
          </button>
          
          <button 
            onClick={() => {
              try {
                if (!responseMapping.rawResponse || !responseMapping.rawResponse.trim()) {
                  alert('Please enter the API response JSON first.');
                  return;
                }
                
                const rawResponse = JSON.parse(responseMapping.rawResponse);
                const autoMappings = autoDetectMapping(rawResponse, {});
                console.log('🔍 Auto-detected mappings:', autoMappings);
                
                if (Object.keys(autoMappings).length > 0) {
                  setResponseMapping(prev => ({
                    ...prev,
                    desiredOutput: JSON.stringify(autoMappings, null, 2)
                  }));
                  alert(`Auto-detected ${Object.keys(autoMappings).length} field mappings!`);
                } else {
                  alert('No automatic mappings detected. Please define mappings manually.');
                }
              } catch (error) {
                console.error('Auto-detect error:', error);
                alert('Please enter valid API response JSON first. Error: ' + error.message);
              }
            }}
            className="btn secondary"
            disabled={!responseMapping.rawResponse}
            style={{ marginLeft: '10px' }}
          >
            🔍 Auto-Detect Mappings
          </button>
          
          {responseMapping.generated && (
            <div className="generated-spec">
              <h5>Generated JOLT Specification:</h5>
              <pre className="jolt-preview">
                {JSON.stringify(responseMapping.generated, null, 2)}
              </pre>
              
              {/* JOLT Preview Section */}
              {responseMapping.joltPreview && (
                <div className="jolt-preview-section">
                  <h5>✅ JOLT Transformation Preview:</h5>
                  <pre className="jolt-preview success">
                    {JSON.stringify(responseMapping.joltPreview, null, 2)}
                  </pre>
                </div>
              )}
              
              {responseMapping.joltError && (
                <div className="jolt-error-section">
                  <h5>❌ JOLT Validation Error:</h5>
                  <div className="jolt-error">
                    {responseMapping.joltError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="error-section">
          <h4>❌ Error Response Transformation</h4>
          <p className="help-text">Define how to handle error responses from your API:</p>
          
          <div className="transformation-guide">
            <div className="guide-section">
              <h5>📝 How to Fill the Error Mapping:</h5>
              <div className="guide-examples">
                <div className="example-item">
                  <span className="example-label">1️⃣ Left Side (Error Response):</span>
                  <span className="example-desc">Paste the EXACT JSON error response from your API</span>
                </div>
                <div className="example-item">
                  <span className="example-label">2️⃣ Right Side (Error Mapping):</span>
                  <span className="example-desc">Map error fields to standard error variables</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="json-transformation">
            <div className="json-input-group">
              <label>📥 Expected Error Response (JSON):</label>
              <div className="input-help">
                <small>💡 <strong>Tip:</strong> Test your API with invalid data to get the error response format</small>
              </div>
              <textarea
                placeholder={`📋 EXAMPLE - Banking API Error:
{
  "status": "400",
  "GetDebitCardDetailsRes": {
    "ResponseHeader": {
      "APIResponse": {
        "StatusCode": "9999"
      }
    },
    "ErrorDetails": {
      "ErrorInfo": {
        "ErrorCode": "E001",
        "ErrorLongDesc": "Invalid account number",
        "ErrorShortDesc": "Invalid Account"
      }
    }
  }
}

📋 EXAMPLE - User API Error:
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication failed",
    "details": "Invalid credentials provided"
  },
  "status": 401
}

📋 EXAMPLE - Payment API Error:
{
  "result": "FAILED",
  "errorCode": "INSUFFICIENT_FUNDS",
  "errorMessage": "Insufficient balance for transaction",
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                rows={12}
                className="json-input error"
                value={errorMapping.rawError || ''}
                onChange={(e) => setErrorMapping(prev => ({...prev, rawError: e.target.value}))}
              />
            </div>
            
            <div className="arrow-transform">
              <span>❌</span>
              <small>Map Errors</small>
            </div>
            
            <div className="json-input-group">
              <label>📤 Error Field Mapping (source → target):</label>
              <div className="input-help">
                <small>💡 <strong>Standard Variables:</strong> errorCode, errorMessage, statusCode</small>
              </div>
              <textarea
                placeholder={`📋 ERROR MAPPING - Banking Example:
{
  "GetDebitCardDetailsRes.ErrorDetails.ErrorInfo.ErrorCode": "errorCode",
  "GetDebitCardDetailsRes.ErrorDetails.ErrorInfo.ErrorLongDesc": "errorMessage",
  "GetDebitCardDetailsRes.ResponseHeader.APIResponse.StatusCode": "statusCode",
  "status": "httpStatus"
}

📋 GENERATED ERROR JOLT SPEC WILL BE:
{
  "operation": "shift",
  "spec": {
    "input": {
      "GetDebitCardDetailsRes": {
        "ErrorDetails": {
          "ErrorInfo": {
            "ErrorCode": "errorCode",
            "ErrorLongDesc": "errorMessage"
          }
        },
        "ResponseHeader": {
          "APIResponse": {
            "StatusCode": "statusCode"
          }
        }
      },
      "status": "httpStatus"
    }
  }
},
{
  "operation": "default",
  "spec": {
    "success": false,
    "error": true,
    "timestamp": "@(1,timestamp)",
    "status": "FAILED"
  }
}

🎯 COMMON ERROR VARIABLES:
✅ errorCode - The error code (E001, AUTH_FAILED, etc.)
✅ errorMessage - User-friendly error message
✅ statusCode - API status code (9999, 401, etc.)
✅ httpStatus - HTTP status (400, 500, etc.)

⚠️ REMEMBER: "API.error.path": "errorVariableName"`}
                rows={12}
                className="json-input error"
                value={errorMapping.desiredError || ''}
                onChange={(e) => setErrorMapping(prev => ({...prev, desiredError: e.target.value}))}
              />
            </div>
          </div>
          
          <button 
            onClick={generateErrorMapping}
            className="btn secondary"
            disabled={!errorMapping.rawError || !errorMapping.desiredError}
          >
            🔄 Generate Error JOLT Spec
          </button>
          
          <button 
            onClick={() => {
              try {
                if (!errorMapping.rawError || !errorMapping.rawError.trim()) {
                  alert('Please enter the error response JSON first.');
                  return;
                }
                
                const rawError = JSON.parse(errorMapping.rawError);
                const autoMappings = autoDetectMapping(rawError, {});
                console.log('🔍 Auto-detected error mappings:', autoMappings);
                
                if (Object.keys(autoMappings).length > 0) {
                  setErrorMapping(prev => ({
                    ...prev,
                    desiredError: JSON.stringify(autoMappings, null, 2)
                  }));
                  alert(`Auto-detected ${Object.keys(autoMappings).length} error field mappings!`);
                } else {
                  alert('No automatic error mappings detected. Please define mappings manually.');
                }
              } catch (error) {
                console.error('Auto-detect error mappings error:', error);
                alert('Please enter valid error response JSON first. Error: ' + error.message);
              }
            }}
            className="btn secondary"
            disabled={!errorMapping.rawError}
            style={{ marginLeft: '10px' }}
          >
            🔍 Auto-Detect Error Mappings
          </button>
          
          {errorMapping.generated && (
            <div className="generated-spec">
              <h5>Generated Error JOLT Specification:</h5>
              <pre className="jolt-preview error">
                {JSON.stringify(errorMapping.generated, null, 2)}
              </pre>
              
              {/* JOLT Preview Section */}
              {errorMapping.joltPreview && (
                <div className="jolt-preview-section">
                  <h5>✅ JOLT Error Transformation Preview:</h5>
                  <pre className="jolt-preview success">
                    {JSON.stringify(errorMapping.joltPreview, null, 2)}
                  </pre>
                </div>
              )}
              
              {errorMapping.joltError && (
                <div className="jolt-error-section">
                  <h5>❌ JOLT Validation Error:</h5>
                  <div className="jolt-error">
                    {errorMapping.joltError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="step-buttons">
          <button onClick={() => setStep(2)} className="btn secondary">← Back</button>
          <button 
            onClick={generateJoltSpecs} 
            className="btn primary"
            disabled={!responseMapping.generated || !errorMapping.generated}
          >
            Next: Generate Complete Template →
          </button>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="step-content">
      <h3>Step 4: Review Generated Template</h3>
      
      <div className="template-preview">
        <pre className="json-preview">
          {JSON.stringify(templateData, null, 2)}
        </pre>
      </div>
      
      <div className="template-actions">
        <div className="action-group">
          <h4>💾 Save Options:</h4>
          <div className="save-buttons">
            <button onClick={handleSave} className="btn primary">
              💾 Save & Download Template
            </button>
            <button onClick={handleDownload} className="btn secondary">
              📥 Download Only
            </button>
          </div>
          <small className="help-text">
            💡 Templates are saved to browser storage AND downloaded to your project folder
          </small>
        </div>
        
        <div className="action-group">
          <h4>📁 Import Options:</h4>
          <div className="import-buttons">
            <button onClick={handleImportTemplate} className="btn secondary">
              📂 Import Template File
            </button>
          </div>
          <small className="help-text">
            💡 Import existing .json template files from your project folder
          </small>
        </div>
      </div>
      
      <div className="step-buttons">
        <button onClick={() => setStep(3)} className="btn secondary">← Back</button>
        <button onClick={handleSave} className="btn primary">💾 Save Template</button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="api-template-overlay">
      <div className="api-template-modal">
        <div className="modal-header">
          <h2>API Template Builder</h2>
          <div className="header-actions">
            <button 
              onClick={handleImportTemplate} 
              className="btn secondary import-btn"
              title="Import template from file"
            >
              📂 Import
            </button>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>
        
        <div className="step-indicator">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className={`step ${step >= num ? 'active' : ''}`}>
              {num}
            </div>
          ))}
        </div>
        
        <div className="modal-content">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

export default ApiTemplateBuilder;
