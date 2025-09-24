import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ApiTemplateBuilderEnhanced.css';
import './TemplateManager.css';
import './SessionAwareStyles.css';
import './DataTypeGroupings.css';

// Error Boundary Component
class TemplateCreatorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TemplateCreator Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo || { componentStack: 'Component stack not available' }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '5px' }}>
          <h4>🚨 Template Creator Error</h4>
          <p>Something went wrong in the template creator. This is likely due to invalid session data.</p>
          <details style={{ marginTop: '10px' }}>
            <summary>Error Details</summary>
            <pre style={{ marginTop: '10px', fontSize: '12px' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ marginTop: '10px', padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
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

const TemplateCreator = ({ onClose, onCreate, availableVariables = [], availableVariablesByTemplate = {}, nextNodeInfo = null }) => {
  // Safe render helper to prevent object rendering
  const safeRender = (value) => {
    console.log('🔍 safeRender called with:', value, 'type:', typeof value);
    if (value === null || value === undefined) {
      console.log('✅ safeRender: null/undefined → empty string');
      return '';
    }
    if (typeof value === 'object') {
      console.error('🚨 OBJECT DETECTED in safeRender:', value, 'keys:', Object.keys(value), 'stack:', new Error().stack);
      if (Array.isArray(value)) {
        console.log('✅ safeRender: array → joined string');
        return value.join(', ');
      }
      if (Object.keys(value).length === 0) {
        console.log('✅ safeRender: empty object → empty string');
        return ''; // Handle empty objects
      }
      console.log('✅ safeRender: object → JSON string');
      return JSON.stringify(value);
    }
    console.log('✅ safeRender: primitive → string');
    return String(value);
  };

  // Add debugging and safety checks
  console.log('TemplateCreator props:', { 
    availableVariables: availableVariables, 
    availableVariablesType: typeof availableVariables,
    availableVariablesIsArray: Array.isArray(availableVariables),
    availableVariablesLength: Array.isArray(availableVariables) ? availableVariables.length : 'N/A',
    nextNodeInfo, 
    onClose: typeof onClose, 
    onCreate: typeof onCreate 
  });

  // Ensure availableVariables is always an array of strings
  const safeAvailableVariables = React.useMemo(() => {
    try {
      if (!Array.isArray(availableVariables)) {
        console.warn('availableVariables is not an array:', availableVariables);
        return [];
      }
      
      console.log('Processing availableVariables:', availableVariables);
      
      const processed = availableVariables
        .filter(variable => {
          // Filter out null, undefined, and invalid values
          if (variable === null || variable === undefined) {
            console.log('Filtering out null/undefined variable');
            return false;
          }
          
          // If it's an object, check if it has meaningful properties
          if (typeof variable === 'object') {
            if (Object.keys(variable).length === 0) {
              console.warn('Filtering out empty object from availableVariables:', variable);
              return false;
            }
            // For objects, try to extract a string representation
            return variable.name || variable.id || variable.key || false;
          }
          
          // Keep strings and numbers
          return typeof variable === 'string' || typeof variable === 'number';
        })
        .map(variable => {
          // Convert everything to string safely
          if (typeof variable === 'object' && variable !== null) {
            return variable.name || variable.id || variable.key || JSON.stringify(variable);
          }
          return String(variable);
        })
        .filter(str => str && str.trim().length > 0); // Remove empty strings
      
      console.log('Processed safeAvailableVariables:', processed);
      return processed;
    } catch (error) {
      console.error('Error processing availableVariables:', error);
      return [];
    }
  }, [availableVariables]);

  // Add body class to prevent scrolling and ensure full screen
  useEffect(() => {
    // Force full screen coverage by modifying body
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    
    // Cleanup when component unmounts
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

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

  // Dynamic Menu specific state
  const [isDynamicMenuNext, setIsDynamicMenuNext] = useState(false);
  const [arrayPreview, setArrayPreview] = useState(null);
  const [selectedArrayConfig, setSelectedArrayConfig] = useState({
    selectedArray: null,
    displayKey: '',
    valueKey: '',
    sessionVariable: '',
    customSessionName: ''
  });
  const [arrayAnalysis, setArrayAnalysis] = useState({
    detectedArrays: [],
    selectedArray: null,
    arrayType: null,
    possibleKeys: [],
    selectedDisplayKey: '',
    selectedIdKey: '',
    menuPreview: []
  });

  // Check if next node is Dynamic Menu
  useEffect(() => {
    if (nextNodeInfo && nextNodeInfo.type === 'DYNAMIC-MENU') {
      setIsDynamicMenuNext(true);
    }
  }, [nextNodeInfo]);

  // JOLT validation and preview function
  const validateAndPreviewJolt = async (joltSpec, inputData, mappingType) => {
    const result = validateJoltSpec(joltSpec, inputData, mappingType);
    return { 
      preview: result.result, 
      error: result.error 
    };
  };

  // Array Analysis Functions for Dynamic Menu
  const analyzeArraysInResponse = (responseObj) => {
    const arrays = [];
    
    const findArrays = (obj, path = '') => {
      if (Array.isArray(obj)) {
        const arrayInfo = {
          path: path,
          size: obj.length,
          type: determineArrayType(obj),
          sampleData: obj.slice(0, 5), // First 5 items as sample for preview
          sampleKeys: obj.length > 0 ? extractKeysFromArrayItems(obj) : []
        };
        arrays.push(arrayInfo);
      } else if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          findArrays(obj[key], newPath);
        });
      }
    };
    
    findArrays(responseObj);
    return arrays;
  };

  const determineArrayType = (array) => {
    if (array.length === 0) return 'empty';
    
    const firstItem = array[0];
    const allSameType = array.every(item => typeof item === typeof firstItem);
    
    if (allSameType) {
      if (typeof firstItem === 'string') return 'strings';
      if (typeof firstItem === 'number') return 'numbers';
      if (typeof firstItem === 'boolean') return 'booleans';
      if (firstItem === null) return 'nulls';
      if (typeof firstItem === 'object' && !Array.isArray(firstItem)) return 'objects';
      if (Array.isArray(firstItem)) return 'arrays';
    }
    
    return 'mixed';
  };

  const extractKeysFromArrayItems = (array) => {
    const keys = new Set();
    
    array.forEach(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach(key => keys.add(key));
      }
    });
    
    return Array.from(keys);
  };

  // Generate smart session variable names based on array path
  const generateSmartSessionName = (arrayPath) => {
    const commonMappings = {
      'data': 'items_menu',
      'items': 'items_menu', 
      'products': 'products_menu',
      'books': 'books_menu',
      'accounts': 'accounts_menu',
      'users': 'users_menu',
      'categories': 'categories_menu',
      'orders': 'orders_menu',
      'transactions': 'transactions_menu',
      'chapters': 'chapters_menu',
      'locations': 'locations_menu',
      'services': 'services_menu',
      'results': 'results_menu'
    };
    
    // Clean path and get meaningful name
    const cleanPath = arrayPath.toLowerCase().replace(/\./g, '_');
    
    // Check if we have a specific mapping
    if (commonMappings[cleanPath]) {
      return commonMappings[cleanPath];
    }
    
    // For nested paths like "response.data", use the last meaningful part
    const pathParts = cleanPath.split('_');
    const meaningfulPart = pathParts[pathParts.length - 1];
    
    if (commonMappings[meaningfulPart]) {
      return commonMappings[meaningfulPart];
    }
    
    // Default: use the path with _menu suffix
    return `${cleanPath}_menu`;
  };

  // Extract session variables from cURL command
  const extractSessionVariables = (curlCommand) => {
    try {
      const regex = /\{\{([^}]+)\}\}/g;
      const variables = [];
      let match;
      
      while ((match = regex.exec(curlCommand)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
      
      return variables;
    } catch (error) {
      console.error('Error extracting session variables:', error);
      return [];
    }
  };

  // Get description for session variables
  const getVariableDescription = (variable) => {
    try {
      const descriptions = {
        'PIN': 'User entered PIN from input node',
        'sessionId': 'Unique session identifier',
        'userId': 'User ID from authentication',
        'selectedBook.title': 'Title of book selected from dynamic menu',
        'selectedBook.author': 'Author of selected book',
        'selectedBook.year': 'Publication year of selected book',
        'selectedProduct.id': 'ID of selected product',
        'selectedProduct.name': 'Name of selected product',
        'selectedProduct.price': 'Price of selected product',
        'selectedItem.id': 'ID of selected item from dynamic menu',
        'selectedItem.name': 'Name of selected item from dynamic menu',
        'selectedIndex': 'Index (0,1,2...) of user selection',
        'authToken': 'Authentication token from login',
        'customerEmail': 'Customer email from session',
        'customerPhone': 'Customer phone from session'
      };
      
      // Check for exact match first
      if (descriptions[variable]) {
        return descriptions[variable];
      }
      
      // Check for patterns
      if (variable.startsWith('selected')) {
        return 'Data from user\'s dynamic menu selection';
      }
      if (variable.includes('_menu_')) {
        return 'Data from dynamic menu array';
      }
      if (variable.toLowerCase().includes('token')) {
        return 'Authentication or authorization token';
      }
      if (variable.toLowerCase().includes('id')) {
        return 'Identifier value from session';
      }
      
      return 'Session variable (will be replaced at runtime)';
    } catch (error) {
      console.error('Error getting variable description:', error);
      return 'Session variable';
    }
  };

  const generateMenuPreview = (array, displayKey, idKey = null) => {
    if (!array || array.length === 0) return [];
    
    return array.slice(0, 10).map((item, index) => {
      let displayText, idValue;
      
      if (typeof item === 'string' || typeof item === 'number') {
        displayText = String(item);
        idValue = String(item);
      } else if (item && typeof item === 'object') {
        displayText = displayKey ? (item[displayKey] || String(item)) : String(item);
        idValue = idKey ? (item[idKey] || displayText) : displayText;
      } else {
        displayText = String(item);
        idValue = String(item);
      }
      
      return {
        option: index + 1,
        display: displayText,
        id: idValue,
        fullItem: item
      };
    });
  };

  const handleResponseSamplePaste = (sampleResponse) => {
    if (isDynamicMenuNext) {
      try {
        const parsed = JSON.parse(sampleResponse);
        const detectedArrays = analyzeArraysInResponse(parsed);
        
        setArrayAnalysis(prev => ({
          ...prev,
          detectedArrays: detectedArrays
        }));
        
        // Auto-select first array if only one found
        if (detectedArrays.length === 1) {
          handleArraySelection(detectedArrays[0]);
        }
      } catch (error) {
        console.log('Could not parse response for array analysis:', error);
      }
    }
  };

  const handleArraySelection = (arrayInfo) => {
    setArrayAnalysis(prev => ({
      ...prev,
      selectedArray: arrayInfo,
      arrayType: arrayInfo.type,
      possibleKeys: arrayInfo.possibleKeys,
      selectedDisplayKey: arrayInfo.possibleKeys.length > 0 ? arrayInfo.possibleKeys[0] : '',
      selectedIdKey: arrayInfo.possibleKeys.length > 1 ? arrayInfo.possibleKeys[1] : arrayInfo.possibleKeys[0] || '',
      menuPreview: generateMenuPreview(arrayInfo.sample, arrayInfo.possibleKeys[0], arrayInfo.possibleKeys[1])
    }));
  };

  // Extract fields from nested object - IMPROVED VERSION FROM EXAMPLE
  const extractFieldsFromObject = (obj, prefix = '', results = []) => {
    console.log('Extracting fields from object:', obj, 'prefix:', prefix);
    
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
            mappingType: 'dynamic',
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
          category: prefix.includes('header') ? 'header' : 
                   prefix.includes('query') ? 'query' : 'body',
          mappingType: 'dynamic', // Default to dynamic for body fields
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
      console.log('Parsing cURL:', curlInput);
      
      // Extract basic information using regex
      let method = 'GET';
      let url = '';
      let headers = {};
      let body = {};
      let queryParams = {};
      
      // Parse method
      const methodMatch = curlInput.match(/(?:-X|--request)\s+([A-Z]+)/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      } else {
        // Check if it's a POST with data
        if (curlInput.includes('--data') || curlInput.includes('-d')) {
          method = 'POST';
        }
      }
      
      // Parse URL - Enhanced to handle multi-line curl with query parameters
      const urlMatches = [
        // Handle quoted URLs with query parameters (most common)
        curlInput.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/),
        curlInput.match(/(?:--location|curl)\s+(?:--request\s+\w+\s+)?\\?\s*['"]([^'"]+)['"]/),
        // Handle URLs after --request GET with backslashes
        curlInput.match(/--request\s+GET\s+\\?\s*['"]([^'"]+)['"]/),
        // Handle any quoted http URL
        curlInput.match(/['"]([^'"]*https?:\/\/[^'"]*)['"]/),
        // Handle unquoted URLs
        curlInput.match(/(https?:\/\/[^\s'"\\]+(?:\?[^\s'"\\\n]*)?)/),
        // Original patterns as fallback
        curlInput.match(/curl\s+(?:--location\s+)?['"]([^'"]+)['"]/),
        curlInput.match(/curl\s+(?:--location\s+)?['"]?([^\s'"]+)['"]?/),
        curlInput.match(/(https?:\/\/[^\s'"]+)/)
      ];
      
      for (const match of urlMatches) {
        if (match && match[1]) {
          url = match[1];
          console.log(`✅ URL extracted: ${url}`);
          break;
        }
      }
      
      if (!url) {
        console.log('❌ Failed to extract URL. Trying manual patterns...');
        // Try a more aggressive pattern for your specific format
        const manualMatch = curlInput.match(/http[s]?:\/\/[^\s'"\\]+(?:\?[^\s'"\\]*)?/);
        if (manualMatch) {
          url = manualMatch[0];
          console.log(`✅ Manual URL extraction: ${url}`);
        } else {
          throw new Error('Could not extract URL from cURL command');
        }
      }
      
      // Parse headers
      const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g;
      let headerMatch;
      let headerCount = 0;
      while ((headerMatch = headerRegex.exec(curlInput)) !== null) {
        headers[headerMatch[1].trim()] = headerMatch[2].trim();
        headerCount++;
        console.log(`Found header ${headerCount}:`, headerMatch[1].trim(), '=', headerMatch[2].trim());
      }
      console.log(`Total headers found: ${headerCount}`);
      
      // Parse body - IMPROVED VERSION FROM EXAMPLE
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
            body = { raw: bodyStr };
            console.log('⚠️ Stored as raw data (parsing failed):', bodyStr.substring(0, 100));
          }
        }
      } else {
        console.log('ℹ️ No body data found in cURL');
      }
      
      // Extract query parameters from URL
      try {
        console.log('🔍 Parsing URL for query params:', url);
        const urlObj = new URL(url);
        console.log('🔍 URL object created, searchParams:', urlObj.searchParams.toString());
        urlObj.searchParams.forEach((value, key) => {
          queryParams[key] = value;
          console.log(`🔗 Found query param: ${key} = ${value}`);
        });
        console.log('🔗 Final query parameters object:', queryParams);
      } catch (urlError) {
        console.log('⚠️ Could not parse URL for query parameters:', urlError);
        console.log('⚠️ URL was:', url);
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
          mappingType: 'static', // Headers often static (API keys, content-type)
          storeAttribute: '',
          targetPath: `headers.${headerName}`
        });
      });
      
      // 2. Extract query parameter fields (RESTful query params)
      console.log(`🔍 Processing ${Object.keys(queryParams).length} query parameters...`);
      Object.keys(queryParams).forEach(paramName => {
        const queryField = {
          path: `query.${paramName}`,
          value: queryParams[paramName],
          type: 'string',
          category: 'query',
          mappingType: 'dynamic', // Query params often dynamic
          storeAttribute: paramName, // ✅ PRESERVE ORIGINAL CASE
          targetPath: `query.${paramName}`
        };
        allFields.push(queryField);
        console.log(`✅ Added query field:`, queryField);
      });
      
      // 3. Extract body fields recursively (handles complex nested JSON)
      if (Object.keys(body).length > 0) {
        try {
          // Only extract individual fields if it's proper JSON, not raw data
          if (!body.raw) {
            extractFieldsFromObject(body, '', allFields);
          } else {
            // If it's raw data, add it as a single field
            allFields.push({
              path: 'rawBody',
              value: body.raw,
              type: 'string',
              category: 'body',
              mappingType: 'dynamic',
              storeAttribute: 'rawbody',
              targetPath: 'rawBody'
            });
          }
        } catch (extractError) {
          console.warn('⚠️ Error extracting body fields:', extractError);
          // Add raw body as fallback
          allFields.push({
            path: 'rawBody',
            value: JSON.stringify(body),
            type: 'object',
            category: 'body',
            mappingType: 'dynamic',
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

  // Generate response mapping
  const generateResponseMapping = async () => {
    try {
      console.log('🔧 Raw response input:', responseMapping.rawResponse);
      console.log('🔧 Desired output input:', responseMapping.desiredOutput);
      
      const rawResponse = JSON.parse(responseMapping.rawResponse);
      const desiredOutput = JSON.parse(responseMapping.desiredOutput);
      
      console.log('✅ Parsed Raw Response:', rawResponse);
      console.log('✅ Parsed Desired Output:', desiredOutput);
      
      // If next node is dynamic menu, enhance the desired output with array data
      let enhancedDesiredOutput = { ...desiredOutput };
      if (isDynamicMenuNext && selectedArrayConfig.selectedArray !== null) {
        console.log('🔍 Dynamic menu detected with selected configuration:', selectedArrayConfig);
        const detectedArrays = analyzeArraysInResponse(rawResponse);
        
        if (detectedArrays.length > 0 && selectedArrayConfig.selectedArray < detectedArrays.length) {
          const selectedArray = detectedArrays[selectedArrayConfig.selectedArray];
          const sessionVarName = selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable;
          
          console.log('📋 Selected array for dynamic menu:', selectedArray);
          console.log('⚙️ Configuration:', selectedArrayConfig);
          
          // Add the selected array configuration to session data
          enhancedDesiredOutput.dynamicMenuData = {
            [sessionVarName]: selectedArray.path,
            [`${sessionVarName}_meta`]: {
              type: selectedArray.type,
              sampleKeys: selectedArray.sampleKeys,
              size: selectedArray.size,
              displayKey: selectedArrayConfig.displayKey,
              valueKey: selectedArrayConfig.valueKey,
              sessionVariable: sessionVarName
            }
          };
          
          console.log('📋 Enhanced desired output with selected dynamic menu data:', enhancedDesiredOutput);
        }
      }
      
      // Use Enhanced JOLT Generator with raw response for dynamic menu support
      let result;
      if (isDynamicMenuNext && selectedArrayConfig.selectedArray !== null) {
        // For dynamic menu, use the nested input.[arrayName].* format
        const sessionVarName = selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable;
        const displayKey = selectedArrayConfig.displayKey || 'name';
        
        // Get the actual array name from the selected array configuration
        const detectedArrays = analyzeArraysInResponse(rawResponse);
        let actualArrayName = 'data'; // fallback
        
        if (detectedArrays.length > 0 && selectedArrayConfig.selectedArray < detectedArrays.length) {
          const selectedArray = detectedArrays[selectedArrayConfig.selectedArray];
          // Extract the array name from the path (e.g., "laptops" from "laptops[0]")
          actualArrayName = selectedArray.path.split('[')[0];
          console.log('🔍 Using actual array name from response:', actualArrayName);
        }
        
        // Build the shift spec using the configured desired output mappings
        const shiftSpec = {
          "input": {}
        };
        
        // Add non-array mappings from desired output
        Object.entries(desiredOutput).forEach(([sourcePath, targetPath]) => {
          if (sourcePath !== actualArrayName && typeof targetPath === 'string') {
            shiftSpec.input[sourcePath] = targetPath;
          }
        });
        
        // Add the array mapping for dynamic menu
        shiftSpec.input[actualArrayName] = {
          "*": {
            "@": `${sessionVarName}[]`,
            [displayKey]: `${sessionVarName.replace(/_items$/, '')}_menu_raw[]`
          }
        };
        
        result = [
          {
            "operation": "shift",
            "spec": shiftSpec
          },
          {
            "operation": "default",
            "spec": {
              "success": true,
              "timestamp": new Date().toISOString(),
              "status": "SUCCEEDED"
            }
          }
        ];
        console.log('🎯 Generated dynamic menu JOLT with configured mappings:', result);
      } else {
        // Use standard JOLT generator for non-dynamic menu cases
        result = generateResponseJolt(rawResponse, enhancedDesiredOutput, {
          isDynamicMenuNext: isDynamicMenuNext,
          originalResponse: rawResponse
        });
      }
      
      setResponseMapping(prev => ({
        ...prev,
        generated: result,
        joltError: null
      }));

      // Preview the transformation
      const preview = await validateAndPreviewJolt(result, rawResponse, 'response');
      setResponseMapping(prev => ({
        ...prev,
        joltPreview: preview.preview,
        joltError: preview.error
      }));

    } catch (error) {
      console.error('❌ Error generating response mapping:', error);
      setResponseMapping(prev => ({
        ...prev,
        generated: null,
        joltPreview: null,
        joltError: error.message
      }));
    }
  };

  // Generate error mapping
  const generateErrorMapping = async () => {
    try {
      console.log('🔧 Raw error input:', errorMapping.rawError);
      console.log('🔧 Desired error input:', errorMapping.desiredError);
      
      const rawError = JSON.parse(errorMapping.rawError);
      const desiredError = JSON.parse(errorMapping.desiredError);
      
      console.log('✅ Parsed Raw Error:', rawError);
      console.log('✅ Parsed Desired Error:', desiredError);
      
      // Use Enhanced JOLT Generator
      const result = generateErrorJolt(rawError, desiredError);
      
      setErrorMapping(prev => ({
        ...prev,
        generated: result,
        joltError: null
      }));

      // Preview the transformation
      const preview = await validateAndPreviewJolt(result, rawError, 'error');
      setErrorMapping(prev => ({
        ...prev,
        joltPreview: preview.preview,
        joltError: preview.error
      }));

    } catch (error) {
      console.error('❌ Error generating error mapping:', error);
      setErrorMapping(prev => ({
        ...prev,
        generated: null,
        joltPreview: null,
        joltError: error.message
      }));
    }
  };

  // Generate session-aware JOLT specifications for menu selection
  const generateSessionAwareJoltSpecs = () => {
    console.log('🎯 Generating session-aware JOLT specs for menu selection...');
    console.log('🔍 Available variables:', safeAvailableVariables);
    console.log('🔍 Selected array config:', selectedArrayConfig);
    console.log('🔍 Array preview state:', arrayPreview);
    
    // First, try to use the previously configured array from selectedArrayConfig
    let menuArrayName = null;
    
    if (selectedArrayConfig.selectedArray !== null && arrayPreview?.detectedArrays?.length > 0) {
      // Use the array that was previously selected and configured
      const selectedArrayIndex = selectedArrayConfig.selectedArray;
      if (selectedArrayIndex < arrayPreview.detectedArrays.length) {
        menuArrayName = selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable;
        console.log('✅ Using previously configured array:', menuArrayName);
        console.log('📋 Array config details:', {
          index: selectedArrayIndex,
          sessionVariable: selectedArrayConfig.sessionVariable,
          customName: selectedArrayConfig.customSessionName,
          displayKey: selectedArrayConfig.displayKey,
          valueKey: selectedArrayConfig.valueKey
        });
      }
    }
    
    // For second templates: get template name directly from session variable source
    if (!menuArrayName) {
      console.log('🔍 Checking for session variables from previous templates...');
      console.log('🔍 Current requestMapping:', requestMapping);
      
      const sessionFields = requestMapping.filter(field => 
        field.mappingType === 'session' && field.storeAttribute && 
        (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
      );
      
      console.log('🔍 Found session fields:', sessionFields);
      
      if (sessionFields.length > 0) {
        const firstSessionVar = sessionFields[0].storeAttribute;
        console.log('🎯 Found session variable:', firstSessionVar);
        
        // Instead of extracting from pattern, get the template name directly
        // Check which template this session variable belongs to
        if (availableVariablesByTemplate && Object.keys(availableVariablesByTemplate).length > 0) {
          // Find which template contains this session variable
          for (const [templateName, variables] of Object.entries(availableVariablesByTemplate)) {
            if (variables.includes(firstSessionVar)) {
              menuArrayName = templateName;
              console.log('✅ Found session variable belongs to template:', templateName);
              console.log('🎯 Using template name directly:', menuArrayName);
              break;
            }
          }
        }
        
        // Fallback: extract from pattern if template lookup failed
        if (!menuArrayName && firstSessionVar.includes('_selectedItem.')) {
          const parts = firstSessionVar.split('_selectedItem.');
          if (parts.length >= 2) {
            menuArrayName = parts[0]; // e.g., "FICTION"
            console.log('✅ Fallback: Extracted template name from pattern:', menuArrayName);
          }
        } else if (!menuArrayName && firstSessionVar.includes('selectedItem.')) {
          // Generic selectedItem - look for any session variables with _items pattern
          const itemsVariable = safeAvailableVariables.find(v => v.endsWith('_items'));
          if (itemsVariable) {
            menuArrayName = itemsVariable.replace('_items', '');
            console.log('✅ Found generic session variable with items pattern:', menuArrayName);
          }
        }
      } else {
        console.log('⚠️ No session fields with selectedItem pattern found');
      }
    }
    
    // Fallback: try to detect menu arrays from session variables with smart grouping
    if (!menuArrayName) {
      console.log('🔍 No configured array found, attempting pattern detection...');
      console.log('⚠️ WARNING: Template name extraction failed, falling back to pattern detection');
      console.log('🔍 This means menuArrayName is still null after session variable extraction');
      
      // Group related variables by their base name (e.g., items_menu_for_APICALL_ONE)
      const menuGroups = {};
      safeAvailableVariables.forEach(variable => {
        // Look for menu-related patterns
        if (variable.includes('menu') && 
            (variable.includes('items') || variable.includes('_menu_') || variable.includes('menu_for_'))) {
          
          // Extract base name by removing suffixes like _items, _menu_raw, _values
          let baseName = variable;
          [/_items$/, /_menu_raw$/, /_values$/, /_data$/, /_list$/].forEach(suffix => {
            baseName = baseName.replace(suffix, '');
          });
          
          if (!menuGroups[baseName]) {
            menuGroups[baseName] = [];
          }
          menuGroups[baseName].push(variable);
        }
      });
      
      console.log('📋 Detected menu groups:', menuGroups);
      
      // Choose the group with the most complete set of variables
      const bestGroup = Object.entries(menuGroups)
        .sort(([,a], [,b]) => b.length - a.length)[0];
      
      if (bestGroup) {
        const [baseName, variables] = bestGroup;
        // Prefer the main items array, then any array-like variable
        menuArrayName = variables.find(v => v.endsWith('_items')) ||
                       variables.find(v => v.includes('items')) ||
                       variables[0];
        
        console.log('✅ Selected from group detection:', {
          baseName,
          availableVariables: variables,
          selectedArray: menuArrayName
        });
      }
    }
    
    if (!menuArrayName) {
      console.warn('⚠️ No menu arrays found in configuration or session variables');
      console.log('⚠️ Available variables:', safeAvailableVariables);
      console.log('⚠️ Array config:', selectedArrayConfig);
      alert('⚠️ No dynamic menu array configuration found. Please configure an array in Step 2 first, or ensure your session variables contain menu data.');
      return generateJoltSpecs();
    }
    
    console.log('🎯 Final menu array name:', menuArrayName);
    
    // Create session-aware request template
    const sessionAwareRequestJolt = [];
    
    // Check if any fields need session data from selected items (support both generic and API-specific)
    const hasSessionFields = requestMapping.some(field => 
      field.mappingType === 'session' && field.storeAttribute && 
      (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
    );
    
    console.log('🔍 Has session fields:', hasSessionFields);
    console.log('🔍 Request mapping:', requestMapping.map(f => ({
      path: f.path,
      mappingType: f.mappingType,
      storeAttribute: f.storeAttribute
    })));
    
    if (hasSessionFields) {
      console.log('✅ Found session fields, generating traditional two-shift pattern');
      console.log('🎯 Using previous template name in JOLT generation:', menuArrayName);
      
      // Use traditional two-shift pattern instead of modify-overwrite-beta
      // This matches the expected format with previous template name
    } else {
      console.warn('⚠️ No session fields found that use selectedItem.* pattern');
      console.log('⚠️ Field mappings:', requestMapping.map(f => `${f.path}: ${f.mappingType} → ${f.storeAttribute}`));
    }
    
    // Step 1: First shift operation - map input and session data  
    const requestShiftSpec = {
      input: {}
    };
    
    requestMapping.forEach(field => {
      if (field.mappingType === 'dynamic' && field.storeAttribute) {
        // Regular dynamic fields from input
        setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
        console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
      }
    });
    
    // Add session array mapping using previous template name
    if (hasSessionFields && menuArrayName) {
      setNestedValue(requestShiftSpec.input, `${menuArrayName}.USERINDEX`, 'selectedItem');
      console.log(`✅ Session array: input.${menuArrayName}.USERINDEX → selectedItem`);
    }
    
    sessionAwareRequestJolt.push({
      operation: "shift",
      spec: requestShiftSpec
    });
    
    // Step 2: Second shift operation - map selectedItem fields
    const selectedItemShiftSpec = {};
    
    requestMapping.forEach(field => {
      if (field.mappingType === 'session' && field.storeAttribute && 
                 field.storeAttribute.includes('selectedItem.')) {
        // Session fields from selected items - map from selectedItem
        const parts = field.storeAttribute.split('selectedItem.');
        if (parts.length >= 2) {
          const fieldName = parts[1]; // e.g., 'title', 'year', 'author'
          const targetPath = field.targetPath || field.path; // e.g., 'profileDetails.authProfile'
          
          // Map selectedItem.fieldName to target path
          setNestedValue(selectedItemShiftSpec, `selectedItem.${fieldName}`, targetPath);
          console.log(`✅ Session field: selectedItem.${fieldName} → ${targetPath}`);
        }
      }
    });
    
    sessionAwareRequestJolt.push({
      operation: "shift", 
      spec: selectedItemShiftSpec
    });
    
    // Step 3: Default operation for static fields
    const requestDefaultSpec = {};
    
    requestMapping.forEach(field => {
      if (field.mappingType === 'static' && field.category !== 'header') {
        // Static fields
        setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
        console.log(`✅ Static field: ${field.targetPath || field.path} = ${field.staticValue || field.value}`);
      }
    });
    
    // Additional static fields
    Object.keys(staticFields).forEach(path => {
      setNestedValue(requestDefaultSpec, path, staticFields[path]);
    });
    
    sessionAwareRequestJolt.push({
      operation: "default",
      spec: requestDefaultSpec
    });

    console.log('🎯 Generated session-aware request JOLT:', sessionAwareRequestJolt);    // Use standard response and error mappings
    const responseJolt = responseMapping.generated || [
      {
        operation: "shift",
        spec: { input: {} }
      },
      {
        operation: "default",
        spec: {
          success: true,
          timestamp: new Date().toISOString(),
          status: "SUCCEEDED"
        }
      }
    ];

    const errorJolt = errorMapping.generated || [
      {
        operation: "shift",
        spec: { input: {} }
      },
      {
        operation: "default",
        spec: {
          success: false,
          error: true,
          timestamp: new Date().toISOString(),
          status: "FAILED",
          errorCode: "UNKNOWN_ERROR",
          errorMessage: "An error occurred"
        }
      }
    ];

    setTemplateData(prev => ({
      ...prev,
      requestTemplate: { joltSpec: sessionAwareRequestJolt },
      responseTemplate: { joltSpec: responseJolt },
      responseErrorTemplate: { joltSpec: errorJolt }
    }));

    setStep(4);
  };

  // Generate JOLT specifications
  // Helper function to check if a JOLT operation is empty
  const isJoltOperationEmpty = (operation) => {
    if (!operation.spec) return true;
    
    if (operation.operation === 'shift') {
      // For shift operations, check if input is empty
      if (operation.spec.input && Object.keys(operation.spec.input).length === 0) {
        return true;
      }
      // For non-input shift specs, check if spec is empty
      if (!operation.spec.input && Object.keys(operation.spec).length === 0) {
        return true;
      }
    } else if (operation.operation === 'default') {
      // For default operations, check if spec is empty
      if (Object.keys(operation.spec).length === 0) {
        return true;
      }
    }
    
    return false;
  };

  // Helper function to filter out empty JOLT operations
  const filterEmptyJoltOperations = (joltSpec) => {
    return joltSpec.filter(operation => !isJoltOperationEmpty(operation));
  };

  const generateJoltSpecs = () => {
    // Get template name for query parameter wrapping
    const templateName = templateData._id || 'TEMPLATE';
    
    // Request template with input wrapper
    const requestShiftSpec = {
      input: {}
    };
    const requestDefaultSpec = {};

    // Process fields with special handling for query parameters
    requestMapping.forEach(field => {
      if (field.mappingType === 'dynamic' && field.storeAttribute) {
        if (field.category === 'query') {
          // For query parameters, use template name wrapping: templateName.fieldName
          const wrappedTarget = `${templateName}.${field.storeAttribute}`;
          setNestedValue(requestShiftSpec.input, field.storeAttribute, wrappedTarget);
          console.log(`✅ Query param (dynamic): input.${field.storeAttribute} → ${wrappedTarget}`);
        } else {
          // Regular dynamic fields (body, session variables, etc.)
          setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
          console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
        }
      } else if (field.mappingType === 'static' && field.category !== 'header') {
        if (field.category === 'query') {
          // For static query parameters, add to default spec with template wrapping
          const wrappedTarget = `${templateName}.${field.storeAttribute}`;
          setNestedValue(requestDefaultSpec, wrappedTarget, field.staticValue || field.value);
          console.log(`✅ Query param (static): ${wrappedTarget} = ${field.staticValue || field.value}`);
        } else {
          // Regular static fields (body fields)
          setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
          console.log(`✅ Static field: ${field.targetPath || field.path} = ${field.staticValue || field.value}`);
        }
      } else if (field.mappingType === 'session' && field.category === 'query') {
        // For session query parameters, map from session variable to template-wrapped target
        if (field.storeAttribute) {
          const wrappedTarget = `${templateName}.${field.storeAttribute}`;
          setNestedValue(requestShiftSpec.input, field.storeAttribute, wrappedTarget);
          console.log(`✅ Query param (session): input.${field.storeAttribute} → ${wrappedTarget}`);
        }
      }
    });

    // Additional static fields
    Object.keys(staticFields).forEach(path => {
      setNestedValue(requestDefaultSpec, path, staticFields[path]);
    });

    // Assemble request JOLT and filter out empty operations
    const rawRequestJolt = [
      {
        operation: "shift",
        spec: requestShiftSpec
      },
      {
        operation: "default",
        spec: requestDefaultSpec
      }
    ];
    
    const requestJolt = filterEmptyJoltOperations(rawRequestJolt);
    console.log(`✅ Request JOLT: Filtered ${rawRequestJolt.length - requestJolt.length} empty operations`);

    // Use generated response and error mappings with proper defaults
    const rawResponseJolt = responseMapping.generated || [
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
          timestamp: new Date().toISOString(),
          status: "SUCCEEDED"
        }
      }
    ];

    const rawErrorJolt = errorMapping.generated || [
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
          timestamp: new Date().toISOString(),
          status: "FAILED",
          errorCode: "UNKNOWN_ERROR",
          errorMessage: "An error occurred"
        }
      }
    ];

    // Filter out empty operations from response and error JOLT
    const responseJolt = filterEmptyJoltOperations(rawResponseJolt);
    const errorJolt = filterEmptyJoltOperations(rawErrorJolt);
    
    console.log(`✅ Response JOLT: Filtered ${rawResponseJolt.length - responseJolt.length} empty operations`);
    console.log(`✅ Error JOLT: Filtered ${rawErrorJolt.length - errorJolt.length} empty operations`);

    setTemplateData(prev => ({
      ...prev,
      requestTemplate: { joltSpec: requestJolt },
      responseTemplate: { 
        joltSpec: responseJolt,
        responseMapping: responseMapping // GRAPH METADATA: Saved for field extraction, NOT exported to NiFi
      },
      responseErrorTemplate: { joltSpec: errorJolt }
    }));

    setStep(4);
  };

  const handleSave = () => {
    // Prepare the template data with dynamic menu fields if enabled
    let finalTemplateData = { ...templateData };
    
    if (isDynamicMenuNext) {
      // Generate session spec for dynamic menu
      const templateId = templateData._id || 'TEMPLATE_ID';
      
      // Use the session variable name from array configuration
      // This should match the session variable name from the template configuration
      let menuArrayName;
      if (selectedArrayConfig.sessionVariable) {
        menuArrayName = selectedArrayConfig.sessionVariable;
      } else if (selectedArrayConfig.customSessionName) {
        menuArrayName = selectedArrayConfig.customSessionName;
      } else {
        // Fallback: try to extract from session variables in request mapping
        const sessionFields = requestMapping.filter(field => 
          field.mappingType === 'session' && field.storeAttribute && 
          (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
        );
        
        if (sessionFields.length > 0) {
          const firstSessionVar = sessionFields[0].storeAttribute;
          if (firstSessionVar.includes('_selectedItem.')) {
            const parts = firstSessionVar.split('_selectedItem.');
            if (parts.length >= 2) {
              menuArrayName = parts[0]; // e.g., "SEARCH"
              console.log('✅ Extracted array name from session variable for menu spec:', menuArrayName);
            }
          }
        }
        
        if (!menuArrayName) {
          // Ultimate fallback - this should rarely be used
          menuArrayName = 'items_menu_book_items';
          console.log('⚠️ Using hardcoded fallback array name:', menuArrayName);
        }
      }
      
      console.log('🔍 Using menuArrayName for sessionSpec:', menuArrayName);
      
      // Generate menu JOLT transformation based on the pattern: {sessionVariable}_menu_raw
      let menuJoltKey;
      if (selectedArrayConfig.customSessionName) {
        menuJoltKey = `${selectedArrayConfig.customSessionName}_menu_raw`;
      } else if (selectedArrayConfig.sessionVariable) {
        // Remove _items suffix if present and add _menu_raw
        const baseName = selectedArrayConfig.sessionVariable.replace(/_items$/, '');
        menuJoltKey = `${baseName}_menu_raw`;
      } else if (menuArrayName && menuArrayName !== 'items_menu_book_items') {
        // Use the extracted array name from session variables
        const baseName = menuArrayName.replace(/_items$/, '');
        menuJoltKey = `${baseName}_menu_raw`;
        console.log('✅ Generated menu JOLT key from extracted array name:', menuJoltKey);
      } else {
        menuJoltKey = 'items_menu_book_menu_raw';
        console.log('⚠️ Using hardcoded fallback menu JOLT key:', menuJoltKey);
      }
      
      // Generate menu JOLT transformation
      const menuJolt = [
        {
          "operation": "shift",
          "spec": {
            [menuJoltKey]: {
              "*": "menu.&1"
            }
          }
        }
      ];
      
      const sessionSpec = [
        {
          "operation": "shift",
          "spec": {
            "*": {
              "*": "&"
            }
          }
        },
        {
          "operation": "shift", 
          "spec": {
            "*": "&",
            [menuArrayName]: {
              "*": {
                "@": `${templateId}.&`
              }
            }
          }
        },
        {
          "operation": "modify-overwrite-beta",
          "spec": {
            "currentNode": "@(1,latestCurrentNode)",
            [templateId]: "=recursivelySortKeys"
          }
        },
        {
          "operation": "remove",
          "spec": {
            [menuArrayName]: "",
            "latestCurrentNode": ""
          }
        }
      ];
      
      finalTemplateData = {
        ...finalTemplateData,
        templateId: templateId,
        sessionSpec: JSON.stringify(sessionSpec),
        menuName: menuJoltKey,
        menuJolt: JSON.stringify(menuJolt),
        isNextMenuDynamic: "Y"
      };
    }
    
    // Save through parent component (localStorage)
    onCreate(finalTemplateData);
    
    // Also auto-save to project folder
    const result = autoSaveTemplate(finalTemplateData);
    if (result.success) {
      console.log('✅ Template auto-saved:', result.message);
    } else {
      console.error('❌ Auto-save failed:', result.error);
    }
    
    onClose();
  };

  // Download template as file
  const handleDownload = () => {
    // First, check if we need to generate session-aware JOLT
    const hasSessionFields = requestMapping.some(field => 
      field.mappingType === 'session' && field.storeAttribute && 
      (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
    );
    
    let finalTemplateData = { ...templateData };
    
    if (hasSessionFields) {
      console.log('🔍 Download: Detected session fields, ensuring proper JOLT generation...');
      
      // Make sure the template data has the correct session-aware JOLT
      // This should match the logic from generateSessionAwareJoltSpecs
      const sessionAwareRequestJolt = [];
      
      // Extract menu array name from session variables
      let menuArrayName = null;
      const sessionFieldsArray = requestMapping.filter(field => 
        field.mappingType === 'session' && field.storeAttribute && 
        (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
      );
      
      if (sessionFieldsArray.length > 0) {
        const firstSessionVar = sessionFieldsArray[0].storeAttribute;
        console.log('🎯 Download: Found session variable:', firstSessionVar);
        
        // Get template name directly from availableVariablesByTemplate
        if (availableVariablesByTemplate && Object.keys(availableVariablesByTemplate).length > 0) {
          for (const [templateName, variables] of Object.entries(availableVariablesByTemplate)) {
            if (variables.includes(firstSessionVar)) {
              menuArrayName = templateName;
              console.log('✅ Download: Found session variable belongs to template:', templateName);
              break;
            }
          }
        }
        
        // Fallback: extract from pattern if template lookup failed
        if (!menuArrayName && firstSessionVar.includes('_selectedItem.')) {
          const parts = firstSessionVar.split('_selectedItem.');
          if (parts.length >= 2) {
            menuArrayName = parts[0];
            console.log('✅ Download: Fallback extracted array name:', menuArrayName);
          }
        }
      }
      
      if (menuArrayName) {
        console.log('✅ Download: Using previous template name:', menuArrayName);
        
        // Generate the traditional two-shift JOLT pattern (not modify-overwrite-beta)
        // Step 1: First shift to map input and session data
        const requestShiftSpec = { input: {} };
        
        // Map dynamic fields
        requestMapping.forEach(field => {
          if (field.mappingType === 'dynamic' && field.storeAttribute) {
            setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
            console.log(`✅ Download: Mapped dynamic field: ${field.storeAttribute} → ${field.targetPath || field.path}`);
          }
        });
        
        // Map the session array using the previous template name
        setNestedValue(requestShiftSpec.input, `${menuArrayName}.USERINDEX`, 'selectedItem');
        console.log(`✅ Download: Mapped session array: ${menuArrayName}.USERINDEX → selectedItem`);
        
        sessionAwareRequestJolt.push({
          operation: "shift",
          spec: requestShiftSpec
        });
        
        // Step 2: Second shift to map selectedItem fields
        const selectedItemShiftSpec = {};
        
        requestMapping.forEach(field => {
          if (field.mappingType === 'session' && field.storeAttribute && 
              field.storeAttribute.includes('selectedItem.')) {
            const parts = field.storeAttribute.split('selectedItem.');
            if (parts.length >= 2) {
              const fieldName = parts[1]; // e.g., 'title', 'author'
              const targetPath = field.targetPath || field.path;
              setNestedValue(selectedItemShiftSpec, `selectedItem.${fieldName}`, targetPath);
              console.log(`✅ Download: Mapped selectedItem field: selectedItem.${fieldName} → ${targetPath}`);
            }
          }
        });
        
        // Add other non-dynamic, non-session fields to the shift
        requestMapping.forEach(field => {
          if (field.mappingType !== 'dynamic' && field.mappingType !== 'session' && 
              field.mappingType !== 'static') {
            // Handle other mapping types if needed
          }
        });
        
        sessionAwareRequestJolt.push({
          operation: "shift",
          spec: selectedItemShiftSpec
        });
        
        // Step 3: Default values for static fields
        const requestDefaultSpec = {};
        requestMapping.forEach(field => {
          if (field.mappingType === 'static' && field.category !== 'header') {
            setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
            console.log(`✅ Download: Mapped static field: ${field.targetPath || field.path} = ${field.staticValue || field.value}`);
          }
        });
        
        sessionAwareRequestJolt.push({
          operation: "default",
          spec: requestDefaultSpec
        });
        
        // Update the template data with corrected JOLT
        finalTemplateData = {
          ...finalTemplateData,
          requestTemplate: { joltSpec: sessionAwareRequestJolt }
        };
        
        console.log('✅ Download: Generated session-aware JOLT:', sessionAwareRequestJolt);
      }
    }
    
    const result = downloadTemplate(finalTemplateData);
    if (result.success) {
      console.log('✅ Template downloaded:', result.fileName);
    } else {
      console.error('❌ Download failed:', result.error);
    }
  };

  // Import template from file
  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const result = await loadTemplateFromFile(file);
          if (result.success) {
            setTemplateData(result.template);
            setStep(4); // Go to review step
            console.log('✅ Template imported:', result.message);
          }
        } catch (error) {
          console.error('❌ Import failed:', error.message);
          alert('Failed to import template: ' + error.message);
        }
      }
    };
    
    input.click();
  };

  const renderStep1 = () => {
    try {
      console.log('🔍 renderStep1 executing...');
      
      // Split the rendering into safe chunks
      const renderExamples = () => {
        try {
          console.log('🔍 Rendering examples section...');
          return (
            <div className="dynamic-examples">
              <h4>🚀 Dynamic Session Examples:</h4>
              <div className="example-tabs">
                <details className="example-detail">
                  <summary>📖 Example: Book Details API (After Menu Selection)</summary>
                  <div className="example-content">
                    <p><strong>Flow:</strong> PIN → Get Books → Select Book → Get Book Details</p>
                    <pre>{`curl -X POST "https://api.bookstore.com/book-details" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "{{selectedBook.title}}",
    "author": "{{selectedBook.author}}",
    "year": "{{selectedBook.year}}",
    "userPin": "{{PIN}}"
  }'`}</pre>
                    <p><small>{safeRender("💡 The {{}} placeholders will be replaced with actual session data")}</small></p>
                  </div>
                </details>
                
                <details className="example-detail">
                  <summary>🛒 Example: Add to Cart (After Product Selection)</summary>
                  <div className="example-content">
                    <p><strong>Flow:</strong> PIN → Get Products → Select Product → Add to Cart</p>
                    <pre>{`curl -X POST "https://api.shop.com/cart/add" \\
  -H "Authorization: Bearer {{authToken}}" \\
  -d '{
    "productId": "{{selectedProduct.id}}",
    "productName": "{{selectedProduct.name}}",
    "quantity": 1,
    "userId": "{{userId}}",
    "sessionId": "{{sessionId}}"
  }'`}</pre>
                  </div>
                </details>
                
                <details className="example-detail">
                  <summary>💰 Example: Get Price (Dynamic Data)</summary>
                  <div className="example-content">
                    <p><strong>Flow:</strong> Categories → Products → Select Product → Get Live Price</p>
                    <pre>{`curl -X GET "https://api.pricing.com/price?id={{selectedItem.productId}}&user={{PIN}}" \\
  -H "X-Session-ID: {{sessionId}}" \\
  -H "Content-Type: application/json"`}</pre>
                  </div>
                </details>
              </div>
            </div>
          );
        } catch (error) {
          console.error('🚨 Error in renderExamples:', error);
          return <div>Error rendering examples</div>;
        }
      };
    return (
      <div className="step-content">
        <div className="step-header">
        <h3>🔥 Step 1: Parse cURL Command & Configure Session Data</h3>
        <p className="step-description">Paste your cURL command below to extract API details. Supports dynamic session-based API calls for multi-step USSD flows!</p>
      </div>
      
      <div className="curl-input-section">
        <div className="input-help">
          <h4>📋 Supported Formats:</h4>
          <ul>
            <li>✅ <strong>Static API Calls:</strong> GET, POST, PUT, DELETE, PATCH with fixed data</li>
            <li>✅ <strong>Dynamic API Calls:</strong> Use session data from previous menu selections</li>
            <li>✅ <strong>Session Variables:</strong> Reference user selections, PIN, menu choices</li>
            <li>✅ <strong>Complex Flows:</strong> Chain multiple APIs with dynamic data</li>
          </ul>
          
          {renderExamples()}
        </div>
        
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder={`� PASTE YOUR CURL COMMAND HERE - FULL SCREEN INPUT AREA!

Example 1 - Postman Export Style:
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

Example 2 - Terminal Style:
curl -X PUT 'http://api.example.com/endpoint' \\
-H 'Content-Type: application/json' \\
-H 'Authorization: Bearer token' \\
-d '{"username": "admin", "password": "secret"}'

🎯 SUPPORTS ALL METHODS: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
🔥 UNLIMITED COMPLEXITY: Any number of headers, params, nested JSON
⚡ SMART PARSING: Automatically extracts and categorizes all fields`}
          className="curl-input"
        />
      </div>
      
      {/* Session Variable Detection - Temporarily Disabled for Debugging */}
      {false && curlInput && curlInput.includes('{{') && (
        <div className="session-variables-section">
          <h4>🔧 Detected Session Variables</h4>
          <p>Found placeholders in your cURL command that will be replaced with session data:</p>
          <div className="detected-variables">
            {Array.isArray(extractSessionVariables(curlInput)) && extractSessionVariables(curlInput).length > 0 ? (
              extractSessionVariables(curlInput).map((variable, index) => (
                <div key={index} className="variable-item">
                  <span className="variable-name">{"{{" + safeRender(variable) + "}}"}</span>
                  <span className="variable-description">
                    {safeRender(getVariableDescription(safeRender(variable)))}
                  </span>
                </div>
              ))
            ) : (
              <div className="variable-item">
                <span className="variable-description">No valid session variables detected</span>
              </div>
            )}
          </div>
          <div className="session-info">
            <small>
              💡 <strong>How it works:</strong> These placeholders will be automatically replaced with actual values from your USSD session when the API is called.
              <br />
              🔄 <strong>Examples:</strong> <code>{"{{selectedBook.title}}"}</code> → "The Hitchhiker's Guide to the Galaxy", <code>{"{{PIN}}"}</code> → "123456"
            </small>
          </div>
        </div>
      )}
      
      <div className="step-actions">
        <button onClick={parseCurlCommand} className="btn primary parse-btn">
          🚀 Parse cURL Command & Extract Fields
        </button>
      </div>
    </div>
  );
  } catch (error) {
    console.error('🚨 Error in renderStep1:', error);
    return (
      <div className="step-content">
        <h3>🔥 Step 1: Parse cURL Command & Configure Session Data</h3>
        <div className="error-message">
          <p>An error occurred in Step 1. Please check the console for details.</p>
          <button onClick={() => window.location.reload()} className="btn primary">Reload Page</button>
        </div>
      </div>
    );
  }
};

  const renderStep2 = () => {
    console.log('Rendering Step 2, requestMapping:', requestMapping);
    
    // Get available store attributes from the current USSD nodes
    const availableAttributes = [
      'pin', 'amount', 'recipient', 'phone', 'accountNumber', 'userInput', 'selection',
      'customerPin', 'requestId', 'bankCode', 'transactionType', 'customerId',
      'merchantReference', 'currencyCode', 'orderNumber', 'customerName', 'customerEmail', 'customerPhone',
      ...safeAvailableVariables.map(String) // Ensure all variables are strings
    ];
    
    // If no fields were extracted, show helpful message
    if (!requestMapping || requestMapping.length === 0) {
      return (
        <div className="step-content">
          <h3>Step 2: Configure Request Parameters</h3>
          <div className="no-fields-message">
            <h4>⚠️ No fields extracted from cURL command</h4>
            <p>This could happen for several reasons:</p>
            <ul>
              <li>The cURL command doesn't contain a JSON body (--data or -d flag)</li>
              <li>The cURL format is not recognized</li>
              <li>The command only uses query parameters or headers</li>
            </ul>
            
            <div className="curl-example">
              <h5>✅ Try this example format:</h5>
              <pre>{`curl -X POST "https://api.example.com/endpoint" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token" \\
  --data '{
    "PrimaryAcctNo": "1234567890",
    "ProcessingCode": "000000",
    "TxnAmt": "1000"
  }'`}</pre>
            </div>
          </div>
          
          <div className="step-buttons">
            <button onClick={() => setStep(1)} className="btn secondary">← Back</button>
            <button onClick={() => setStep(3)} className="btn primary">Skip to Response Mapping →</button>
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
        <p>All fields extracted from your cURL command. Choose data source for each field:</p>
        
        {/* Data Source Guide */}
        <div className="data-source-guide">
          <h4>📊 Choose Your Data Source:</h4>
          <div className="data-source-options">
            <div className="data-option">
              <span className="option-icon">📌</span>
              <div className="option-content">
                <strong>Static Data:</strong> Fixed values that never change
                <br/><small>Example: API keys, app version, constant URLs</small>
              </div>
            </div>
            <div className="data-option">
              <span className="option-icon">✏️</span>
              <div className="option-content">
                <strong>Input Variables:</strong> Data from current user input
                <br/><small>Example: PIN, amount, phone number entered by user</small>
              </div>
            </div>
            <div className="data-option">
              <span className="option-icon">💾</span>
              <div className="option-content">
                <strong>Session Data:</strong> Data from previous API calls
                <br/><small>Example: Selected book ID, user account details, previous responses</small>
              </div>
            </div>
          </div>
        </div>
        
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
            
            {category === 'query' && (
              <div className="category-note" style={{
                backgroundColor: '#e3f2fd', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                fontSize: '12px', 
                marginBottom: '10px',
                border: '1px solid #1976d2'
              }}>
                <strong>📌 Query Parameter Note:</strong> These will be wrapped with template name in JOLT spec 
                (e.g., <code>{templateData._id || 'TEMPLATE'}.grant_type</code>) for proper NiFi handling.
              </div>
            )}
            
            <div className="field-mapping">
              {fieldsByCategory[category].map((field, categoryIndex) => {
                const globalIndex = requestMapping.findIndex(f => f.path === field.path);
                return (
                  <div key={field.path} className="field-row">
                    <div className="field-info">
                      <strong>{safeRender(field.path)}</strong>
                      <span className="field-type">({safeRender(field.type)})</span>
                      <div className="field-value">{
                        (() => {
                          try {
                            const value = field.value;
                            if (value === null || value === undefined) return 'null';
                            if (typeof value === 'object') return JSON.stringify(value);
                            return String(value);
                          } catch (error) {
                            console.error('Error rendering field value:', error, field);
                            return 'Error rendering value';
                          }
                        })()
                      }</div>
                    </div>
                    
                    <div className="field-controls">
                      <div className="data-source-selector">
                        <h5>Choose Data Source:</h5>
                        <div className="radio-group-enhanced">
                          <label className="radio-label-enhanced">
                            <input
                              type="radio"
                              name={`mapping-${globalIndex}`}
                              value="static"
                              checked={field.mappingType === 'static'}
                              onChange={() => updateRequestField(globalIndex, 'mappingType', 'static')}
                            />
                            <div className="radio-content">
                              <span className="radio-icon">📌</span>
                              <div className="radio-text">
                                <strong>1. Static Data</strong>
                                <small>Fixed values from cURL (API keys, headers)</small>
                              </div>
                            </div>
                          </label>
                          
                          <label className="radio-label-enhanced">
                            <input
                              type="radio"
                              name={`mapping-${globalIndex}`}
                              value="dynamic"
                              checked={field.mappingType === 'dynamic'}
                              onChange={() => updateRequestField(globalIndex, 'mappingType', 'dynamic')}
                            />
                            <div className="radio-content">
                              <span className="radio-icon">✏️</span>
                              <div className="radio-text">
                                <strong>2. Dynamic Data</strong>
                                <small>User input from session (AMOUNT, PIN, selection)</small>
                              </div>
                            </div>
                          </label>
                          
                          <label className="radio-label-enhanced">
                            <input
                              type="radio"
                              name={`mapping-${globalIndex}`}
                              value="session"
                              checked={field.mappingType === 'session'}
                              onChange={() => updateRequestField(globalIndex, 'mappingType', 'session')}
                            />
                            <div className="radio-content">
                              <span className="radio-icon">💾</span>
                              <div className="radio-text">
                                <strong>3. Session Data</strong>
                                <small>Previous API responses & menu selections</small>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {/* Configuration based on selected data source */}
                      {field.mappingType === 'static' && (
                        <div className="static-config">
                          <label>📌 Static Values (Fixed Data):</label>
                          <div className="data-type-description">
                            <h6>🔧 What is Static Data?</h6>
                            <p>Fixed values that are part of your cURL command or never change. These are automatically detected from your API configuration.</p>
                          </div>
                          
                          {/* SHOW DETECTED STATIC VALUES FROM CURL */}
                          <div className="detected-static-values">
                            <h6>🔍 Auto-detected from cURL:</h6>
                            <div className="curl-static-preview">
                              {(() => {
                                // Show what was detected from the cURL command
                                const curlFields = Object.keys(templateData?.target?.headers || {});
                                if (curlFields.length > 0) {
                                  return (
                                    <div className="auto-detected-fields">
                                      <strong>Headers:</strong> {curlFields.map(h => `${h}: ${templateData.target.headers[h]}`).join(', ')}
                                    </div>
                                  );
                                } else {
                                  return <em>No headers detected. Add static values manually below.</em>;
                                }
                              })()}
                            </div>
                          </div>
                          
                          <div className="static-value-input-section">
                            <label>Manual Static Value:</label>
                            <input
                              type="text"
                              value={(() => {
                                try {
                                  const value = field.staticValue || field.value || '';
                                  if (typeof value === 'object') return JSON.stringify(value);
                                  return String(value);
                                } catch (error) {
                                  console.error('Error processing static value:', error, field);
                                  return '';
                                }
                              })()}
                              onChange={(e) => updateRequestField(globalIndex, 'staticValue', e.target.value)}
                              placeholder="e.g., 'Bearer token123', 'v1.0', 'application/json'"
                              className="static-value-input"
                            />
                          </div>
                          
                          <div className="static-examples">
                            <h6>💡 Common Static Values:</h6>
                            <div className="example-tags">
                              <span className="example-tag" onClick={() => updateRequestField(globalIndex, 'staticValue', 'application/json')}>
                                application/json
                              </span>
                              <span className="example-tag" onClick={() => updateRequestField(globalIndex, 'staticValue', 'Bearer YOUR_TOKEN')}>
                                Bearer YOUR_TOKEN
                              </span>
                              <span className="example-tag" onClick={() => updateRequestField(globalIndex, 'staticValue', 'v1.0')}>
                                v1.0
                              </span>
                              <span className="example-tag" onClick={() => updateRequestField(globalIndex, 'staticValue', 'true')}>
                                true
                              </span>
                            </div>
                          </div>
                          
                          <div className="help-section">
                            <small className="help-text">
                              🔒 <strong>Static Data:</strong> Values that never change during execution
                              <br/>📋 <strong>Examples:</strong> API keys, version numbers, content-type headers
                            </small>
                          </div>
                        </div>
                      )}
                      
                      {field.mappingType === 'dynamic' && (
                        <div className="input-config">
                          <label>✏️ User Input Variables (Dynamic Data):</label>
                          <div className="data-type-description">
                            <h6>📝 What is Dynamic Data?</h6>
                            <p>Data collected from users during their current session through input nodes (PIN entry, text input, menu selections).</p>
                          </div>
                          
                          <select
                            value={field.storeAttribute || ''}
                            onChange={(e) => updateRequestField(globalIndex, 'storeAttribute', e.target.value)}
                            className="store-attribute-select"
                          >
                            <option value="">Select user input variable...</option>
                            
                            {/* AVAILABLE SESSION VARIABLES FROM YOUR FLOW */}
                            {safeAvailableVariables && safeAvailableVariables.length > 0 && (
                              <optgroup label="📊 Available Input Variables">
                                {safeAvailableVariables
                                  .filter(variable => {
                                    // Only show variables that are likely user input (not API responses)
                                    const varName = variable.toLowerCase();
                                    return !varName.includes('_items') && 
                                           !varName.includes('_menu') && 
                                           !varName.includes('_response') &&
                                           !varName.includes('selecteditem');
                                  })
                                  .map((variable, idx) => (
                                    <option key={idx} value={variable}>
                                      {variable} - User input variable
                                    </option>
                                  ))
                                }
                              </optgroup>
                            )}
                          </select>
                          
                          <div className="custom-input-section">
                            <label>Or enter custom variable name:</label>
                            <input
                              type="text"
                              placeholder="e.g., customerID, transactionRef, voucher_code"
                              value={field.storeAttribute || ''}
                              onChange={(e) => updateRequestField(globalIndex, 'storeAttribute', e.target.value)}
                              className="store-attribute-input"
                            />
                          </div>
                          
                          <div className="help-section">
                            <small className="help-text">
                              💡 <strong>Tip:</strong> These are variables collected from users in Input Nodes during their current USSD session.
                              <br/>📋 <strong>Example:</strong> User enters PIN "1234" → <code>pin</code> = "1234"
                            </small>
                          </div>
                        </div>
                      )}
                      
                      {field.mappingType === 'session' && (
                        <div className="session-config">
                          <label>💾 Session Data Variables (From Previous APIs):</label>
                          <div className="data-type-description">
                            <h6>🔄 What is Session Data?</h6>
                            <p>Data stored from previous API responses in your USSD flow. When you create dynamic menus, this data becomes available for subsequent API calls.</p>
                          </div>
                          
                          <div className="session-data-sections">
                            {/* SECTION 1: PREVIOUS API RESPONSE DATA */}
                            <div className="session-section">
                              <h6>📋 Previous API Response Data:</h6>
                              <select
                                value={field.storeAttribute || ''}
                                onChange={(e) => updateRequestField(globalIndex, 'storeAttribute', e.target.value)}
                                className="store-attribute-select"
                                style={{marginBottom: '10px'}}
                              >
                                <option value="">Select session variable...</option>
                                
                                {/* DYNAMIC SESSION VARIABLES FROM ACTION NODES - GROUPED BY TEMPLATE */}
                                {safeAvailableVariables && safeAvailableVariables.length > 0 ? (
                                  <>
                                    {/* Group session variables by template */}
                                    {Object.entries(availableVariablesByTemplate || {}).map(([templateName, templateVariables]) => {
                                      const filteredVariables = templateVariables.filter(variable => {
                                        const varName = variable.toLowerCase();
                                        // Exclude user input variables (those should be in Dynamic Data)
                                        if (['amount', 'pin', 'userinput', 'selection', 'user_input', 'username'].includes(varName)) {
                                          return false;
                                        }
                                        // Exclude menu raw and values (not needed, we have field extraction)
                                        if (varName.includes('_menu_raw') || varName.includes('_values')) {
                                          return false;
                                        }
                                        return true;
                                      });
                                      
                                      if (filteredVariables.length === 0) return null;
                                      
                                      return (
                                        <optgroup key={templateName} label={`📋 ${templateName}`}>
                                          {filteredVariables.map((variable, idx) => (
                                            <option key={`${templateName}-${idx}`} value={variable}>
                                              {variable}
                                            </option>
                                          ))}
                                        </optgroup>
                                      );
                                    })}
                                    
                                    {/* Fallback: ungrouped variables (shouldn't happen with new system) */}
                                    {Object.keys(availableVariablesByTemplate || {}).length === 0 && (
                                      <optgroup label="📋 Available Session Variables">
                                        {safeAvailableVariables
                                          .filter(variable => {
                                            const varName = variable.toLowerCase();
                                            // Exclude user input variables (those should be in Dynamic Data)
                                            if (['amount', 'pin', 'userinput', 'selection', 'user_input', 'username'].includes(varName)) {
                                              return false;
                                            }
                                            // Exclude menu raw and values (not needed, we have field extraction)
                                            if (varName.includes('_menu_raw') || varName.includes('_values')) {
                                              return false;
                                            }
                                            return true;
                                          })
                                          .map((variable, idx) => (
                                            <option key={idx} value={variable}>
                                              {variable} (From action node template data)
                                            </option>
                                          ))
                                        }
                                      </optgroup>
                                    )}
                                  </>
                                ) : (
                                  <optgroup label="ℹ️ No Session Data Available">
                                    <option value="" disabled>No action nodes with template data found</option>
                                  </optgroup>
                                )}
                              </select>
                              
                              {safeAvailableVariables && safeAvailableVariables.length > 0 && (
                                <div className="available-variables-info">
                                  <h6>💡 Session Variables Available:</h6>
                                  <div className="variables-list">
                                    {safeAvailableVariables
                                      .filter(variable => {
                                        const varName = variable.toLowerCase();
                                        return !['amount', 'pin', 'userinput', 'selection'].includes(varName);
                                      })
                                      .map((variable, idx) => (
                                        <span key={idx} className="variable-tag">
                                          {variable}
                                        </span>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* SECTION 2: DYNAMIC MENU SELECTION DATA */}
                            {(() => {
                              const hasMenuData = selectedArrayConfig.selectedArray !== null && 
                                                 arrayPreview?.detectedArrays?.length > 0;
                              
                              if (hasMenuData) {
                                return (
                                  <div className="session-section menu-selection-section">
                                    <h6>🎯 User's Menu Selection Data:</h6>
                                    <div className="menu-detection-info">
                                      <p>✅ Dynamic menu configured: <code>{selectedArrayConfig.sessionVariable}</code></p>
                                      <small>Select fields from the item the user chose:</small>
                                    </div>
                                    
                                    <select
                                      value={field.storeAttribute || ''}
                                      onChange={(e) => updateRequestField(globalIndex, 'storeAttribute', e.target.value)}
                                      className="store-attribute-select"
                                      style={{marginBottom: '10px'}}
                                    >
                                      <option value="">Select from user's menu choice...</option>
                                      
                                      {/* API-SPECIFIC SELECTED ITEM FIELDS */}
                                      <optgroup label={`🎯 ${templateData._id || 'Current API'} - Selected Item Fields`}>
                                        {(() => {
                                          const apiId = templateData._id || 'CURRENT_API';
                                          const availableFields = arrayPreview.detectedArrays[selectedArrayConfig.selectedArray]?.sampleKeys || [];
                                          
                                          return availableFields.map(fieldName => (
                                            <option key={fieldName} value={`${apiId}_selectedItem.${fieldName}`}>
                                              {apiId}_selectedItem.{fieldName} (Selected {fieldName})
                                            </option>
                                          ));
                                        })()}
                                      </optgroup>
                                      
                                      {/* GENERIC FALLBACK */}
                                      <optgroup label="📋 Generic Selected Item (Backward Compatibility)">
                                        {(() => {
                                          const availableFields = arrayPreview.detectedArrays[selectedArrayConfig.selectedArray]?.sampleKeys || [];
                                          return availableFields.map(fieldName => (
                                            <option key={`generic_${fieldName}`} value={`selectedItem.${fieldName}`}>
                                              selectedItem.{fieldName} (Generic {fieldName})
                                            </option>
                                          ));
                                        })()}
                                      </optgroup>
                                    </select>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="session-section no-menu-section">
                                    <h6>🎯 User's Menu Selection Data:</h6>
                                    <p className="info-message">
                                      ℹ️ No dynamic menu configured yet. Configure an array in Step 2 to see menu selection options.
                                    </p>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          
                          <div className="custom-session-input">
                            <label>Or enter custom session variable:</label>
                            <input
                              type="text"
                              placeholder="e.g., SEARCH_selectedItem.title, userBalance, authToken"
                              value={field.storeAttribute || ''}
                              onChange={(e) => updateRequestField(globalIndex, 'storeAttribute', e.target.value)}
                              className="store-attribute-input"
                            />
                            <div className="jolt-quick-templates">
                              <h6>🚀 Quick JOLT Templates (Click to use):</h6>
                              <div className="template-buttons">
                                <button 
                                  type="button"
                                  className="template-btn"
                                  onClick={() => updateRequestField(globalIndex, 'storeAttribute', `items_menu_for_${templateData._id || 'YOUR_API'}_items`)}
                                >
                                  items_menu_for_{templateData._id || 'YOUR_API'}_items
                                </button>
                                <button 
                                  type="button"
                                  className="template-btn"
                                  onClick={() => updateRequestField(globalIndex, 'storeAttribute', `items_menu_for_${templateData._id || 'YOUR_API'}_menu_raw`)}
                                >
                                  items_menu_for_{templateData._id || 'YOUR_API'}_menu_raw
                                </button>
                                <button 
                                  type="button"
                                  className="template-btn"
                                  onClick={() => updateRequestField(globalIndex, 'storeAttribute', `items_menu_for_${templateData._id || 'YOUR_API'}_values`)}
                                >
                                  items_menu_for_{templateData._id || 'YOUR_API'}_values
                                </button>
                                <button 
                                  type="button"
                                  className="template-btn"
                                  onClick={() => updateRequestField(globalIndex, 'storeAttribute', `${templateData._id || 'YOUR_API'}.status`)}
                                >
                                  {templateData._id || 'YOUR_API'}.status
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="help-section">
                            <small className="help-text">
                              💡 <strong>Session Data Flow:</strong> API1 Response → Store Data → User Selects Menu → API2 Uses Selected Data
                              <br/>📋 <strong>Example:</strong> User selects "Book: 1984" → <code>SEARCH_selectedItem.title</code> = "1984"
                            </small>
                          </div>
                        </div>
                      )}
                      
                      {/* Target Path Configuration */}
                      {(field.mappingType === 'dynamic' || field.mappingType === 'session') && (
                        <div className="target-path-config">
                          <label>🎯 Target Path:</label>
                          <input
                            type="text"
                            value={field.targetPath || field.path}
                            onChange={(e) => updateRequestField(globalIndex, 'targetPath', e.target.value)}
                            placeholder="API field path (e.g., user.accountId)"
                            className="store-attribute-input"
                          />
                          <small className="help-text">Where to put this data in the API request</small>
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
        
        {/* Dynamic Menu Detection Section - MOVED TO TOP */}
        <div className="dynamic-menu-section">
          <h4>🔄 Dynamic Menu Integration</h4>
          <p className="help-text">Automatically detect and prepare array data for dynamic menu nodes:</p>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={isDynamicMenuNext}
                onChange={(e) => setIsDynamicMenuNext(e.target.checked)}
              />
              <span className="checkbox-text">
                📋 Next node is a Dynamic Menu (auto-detect arrays for menu options)
              </span>
            </label>
          </div>
          
          {isDynamicMenuNext && (
            <div className="dynamic-menu-config">
              <div className="info-box">
                <h5>🤖 Auto Array Detection</h5>
                <p>When enabled, the system will:</p>
                <ul>
                  <li>🔍 Scan API response for arrays</li>
                  <li>📊 Analyze array element types (strings, numbers, objects)</li>
                  <li>🔑 Extract available keys from object arrays</li>
                  <li>💾 Prepare data for dynamic menu consumption</li>
                  <li>🔄 Add session variables for seamless menu generation</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
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
}`}
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
              if (responseMapping.rawResponse) {
                try {
                  const parsed = JSON.parse(responseMapping.rawResponse);
                  const autoMappings = autoDetectMapping(parsed);
                  setResponseMapping(prev => ({
                    ...prev, 
                    desiredOutput: JSON.stringify(autoMappings, null, 2)
                  }));
                } catch (e) {
                  alert('Please enter valid JSON in the response field first');
                }
              }
            }}
            className="btn secondary"
            disabled={!responseMapping.rawResponse}
            style={{ marginLeft: '10px' }}
          >
            🔍 Auto-Detect Mappings
          </button>
          
          {/* Array Preview Section - Show when dynamic menu is enabled */}
          {isDynamicMenuNext && (
            <div className="array-preview-section">
              <button 
                onClick={() => {
                  if (responseMapping.rawResponse) {
                    try {
                      const parsed = JSON.parse(responseMapping.rawResponse);
                      const arrays = analyzeArraysInResponse(parsed);
                      console.log('🔍 Detected arrays:', arrays);
                      if (arrays.length > 0) {
                        const preview = {
                          detectedArrays: arrays,
                          totalArrays: arrays.length,
                          recommendations: arrays.map(arr => ({
                            path: arr.path,
                            type: arr.type,
                            suggested: {
                              sessionVariable: generateSmartSessionName(arr.path),
                              displayKey: arr.type === 'objects' ? arr.sampleKeys[1] || arr.sampleKeys[0] : null,
                              valueKey: arr.type === 'objects' ? arr.sampleKeys[0] : 'index'
                            }
                          }))
                        };
                        setArrayPreview(preview);
                      } else {
                        setArrayPreview({ detectedArrays: [], message: 'No arrays detected in the response' });
                      }
                    } catch (e) {
                      console.error('Error previewing arrays:', e);
                      alert('Please enter valid JSON in the response field first');
                    }
                  } else {
                    alert('Please paste your API response in the JSON field above first');
                  }
                }}
                className="btn secondary"
                disabled={!responseMapping.rawResponse}
                style={{ marginLeft: '10px', backgroundColor: '#10b981', color: 'white' }}
              >
                🔍 Preview Arrays for Dynamic Menu
              </button>
              
              {arrayPreview && (
                <div className="preview-result">
                  <h5>📋 Array Detection Results:</h5>
                  {arrayPreview.detectedArrays && arrayPreview.detectedArrays.length > 0 ? (
                    <div className="array-results">
                      <p className="success-message">✅ Found {safeRender(arrayPreview.totalArrays)} array(s) suitable for dynamic menus:</p>
                      
                      {/* Array Selection */}
                      <div className="array-selection-section">
                        <h6>🎯 Select Array for Dynamic Menu:</h6>
                        {arrayPreview.recommendations && arrayPreview.recommendations.map((rec, index) => (
                          <div key={index} className="array-option">
                            <label className="array-option-label">
                              <input
                                type="radio"
                                name="selectedArray"
                                value={index}
                                checked={selectedArrayConfig.selectedArray === index}
                                onChange={(e) => {
                                  const selectedIndex = parseInt(e.target.value);
                                  const selectedRec = arrayPreview.recommendations && arrayPreview.recommendations[selectedIndex];
                                  if (selectedRec) {
                                    setSelectedArrayConfig({
                                      selectedArray: selectedIndex,
                                      displayKey: selectedRec.suggested.displayKey || '',
                                      valueKey: selectedRec.suggested.valueKey || '',
                                      sessionVariable: selectedRec.suggested.sessionVariable,
                                      customSessionName: ''
                                    });
                                  }
                                }}
                              />
                              <div className="array-option-content">
                                <strong>Array #{index + 1}: <code>{safeRender(rec.path)}</code></strong>
                                <div className="array-details">
                                  <span className="array-type">Type: {safeRender(rec.type)}</span>
                                  <span className="array-size">Size: {arrayPreview.detectedArrays && arrayPreview.detectedArrays[index] ? String(arrayPreview.detectedArrays[index].size || 'N/A') : 'N/A'}</span>
                                </div>
                                {rec.type === 'objects' && arrayPreview.detectedArrays && arrayPreview.detectedArrays[index] && (
                                  <div className="available-keys">
                                    <strong>Available Keys:</strong> {safeRender(arrayPreview.detectedArrays[index]?.sampleKeys?.join(', ') || 'N/A')}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* Configuration Section - Show when array is selected */}
                      {selectedArrayConfig.selectedArray !== null && (
                        <div className="array-config-section">
                          <h6>⚙️ Configure Dynamic Menu Settings:</h6>
                          
                          <div className="config-grid">
                            <div className="config-group">
                              <label>📝 Display Key (what users see):</label>
                              {arrayPreview.recommendations && arrayPreview.recommendations[selectedArrayConfig.selectedArray] && arrayPreview.recommendations[selectedArrayConfig.selectedArray].type === 'objects' ? (
                                <select
                                  value={selectedArrayConfig.displayKey}
                                  onChange={(e) => setSelectedArrayConfig(prev => ({...prev, displayKey: e.target.value}))}
                                  className="config-select"
                                >
                                  <option value="">Select display field...</option>
                                  {arrayPreview.detectedArrays && arrayPreview.detectedArrays[selectedArrayConfig.selectedArray] && arrayPreview.detectedArrays[selectedArrayConfig.selectedArray].sampleKeys.map(key => (
                                    <option key={key} value={key}>{safeRender(key)}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value="Direct array values"
                                  disabled
                                  className="config-input disabled"
                                />
                              )}
                            </div>

                            <div className="config-group">
                              <label>🔑 Value Key (for routing):</label>
                              {arrayPreview.recommendations && arrayPreview.recommendations[selectedArrayConfig.selectedArray] && arrayPreview.recommendations[selectedArrayConfig.selectedArray].type === 'objects' ? (
                                <select
                                  value={selectedArrayConfig.valueKey}
                                  onChange={(e) => setSelectedArrayConfig(prev => ({...prev, valueKey: e.target.value}))}
                                  className="config-select"
                                >
                                  <option value="">Select value field...</option>
                                  <option value="index">Array Index (0, 1, 2...)</option>
                                  {arrayPreview.detectedArrays && arrayPreview.detectedArrays[selectedArrayConfig.selectedArray] && arrayPreview.detectedArrays[selectedArrayConfig.selectedArray].sampleKeys.map(key => (
                                    <option key={key} value={key}>{safeRender(key)}</option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={selectedArrayConfig.valueKey}
                                  onChange={(e) => setSelectedArrayConfig(prev => ({...prev, valueKey: e.target.value}))}
                                  className="config-select"
                                >
                                  <option value="index">Array Index (0, 1, 2...)</option>
                                  <option value="value">Direct Values</option>
                                </select>
                              )}
                            </div>

                            <div className="config-group">
                              <label>💾 Session Variable Name:</label>
                              <input
                                type="text"
                                value={selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable}
                                onChange={(e) => setSelectedArrayConfig(prev => ({...prev, customSessionName: e.target.value}))}
                                className="config-input"
                                placeholder={`e.g., ${selectedArrayConfig.selectedArray !== null && arrayPreview.recommendations && arrayPreview.recommendations[selectedArrayConfig.selectedArray] ? String(generateSmartSessionName(arrayPreview.recommendations[selectedArrayConfig.selectedArray].path) || 'books_menu') : 'books_menu'}, products_menu, accounts_menu`}
                              />
                              <div className="naming-guide">
                                <small className="naming-tips">
                                  💡 <strong>Naming Tips:</strong>
                                  <br />• Use descriptive names: <code>books_menu</code>, <code>categories_menu</code>, <code>products_menu</code>
                                  <br />• Avoid generic names like <code>data</code> or <code>items</code> if you have multiple menus
                                  <br />• Use lowercase with underscores: <code>user_accounts_menu</code>
                                </small>
                              </div>
                              <div className="generated-variables">
                                <small className="variable-preview">
                                  🔄 <strong>This will create:</strong>
                                  <br />• <code>{safeRender(selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable || 'menu')}_items</code> (full objects)
                                  <br />• <code>{safeRender(selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable || 'menu')}_menu_raw</code> (display values)
                                  <br />• <code>{safeRender(selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable || 'menu')}_values</code> (routing values)
                                </small>
                              </div>
                            </div>
                          </div>

                          {/* Preview of selected configuration */}
                          <div className="config-preview">
                            <h6>🔍 Configuration Preview:</h6>
                            <div className="preview-details">
                              <p><strong>Array Path:</strong> <code>{safeRender(arrayPreview.recommendations?.[selectedArrayConfig.selectedArray]?.path || 'N/A')}</code></p>
                              <p><strong>Session Variable:</strong> <code>{safeRender(selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable || 'default')}</code></p>
                              {selectedArrayConfig.displayKey && (
                                <p><strong>Display Field:</strong> <code>{selectedArrayConfig.displayKey}</code></p>
                              )}
                              <p><strong>Value Source:</strong> <code>{selectedArrayConfig.valueKey || 'index'}</code></p>
                              
                              {/* Sample menu preview */}
                              <div className="sample-menu">
                                <strong>Sample USSD Menu:</strong>
                                <div className="menu-preview">
                                  {arrayPreview.detectedArrays[selectedArrayConfig.selectedArray].sampleData.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="menu-item">
                                      {idx + 1}. {
                                        arrayPreview.recommendations[selectedArrayConfig.selectedArray].type === 'objects' && selectedArrayConfig.displayKey
                                          ? item[selectedArrayConfig.displayKey] || 'N/A'
                                          : String(item)
                                      }
                                    </div>
                                  ))}
                                  {arrayPreview.detectedArrays?.[selectedArrayConfig.selectedArray]?.size > 3 && (
                                    <div className="menu-item">... and {safeRender((arrayPreview.detectedArrays?.[selectedArrayConfig.selectedArray]?.size || 3) - 3)} more</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="next-steps">
                        <h6>📝 Next Steps:</h6>
                        <ol>
                          <li>Select an array from the options above</li>
                          <li>Configure display and value keys for object arrays</li>
                          <li>Customize session variable name if needed</li>
                          <li>Generate your JOLT spec (configuration will be applied automatically)</li>
                          <li>In your Dynamic Menu node, use the configured session variable</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="no-arrays">
                      <p className="info-message">ℹ️ {safeRender(arrayPreview.message || 'No arrays detected in the response')}</p>
                      <p>Your response doesn't contain arrays suitable for dynamic menus. This is normal if your API returns single objects or simple values.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {responseMapping.generated && (
            <div className="generated-spec">
              <h5>Generated JOLT Specification:</h5>
              <pre className="jolt-preview">
                {JSON.stringify(responseMapping.generated, null, 2)}
              </pre>
              
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
}`}
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
              if (errorMapping.rawError) {
                try {
                  const parsed = JSON.parse(errorMapping.rawError);
                  const autoMappings = autoDetectMapping(parsed);
                  setErrorMapping(prev => ({
                    ...prev, 
                    desiredError: JSON.stringify(autoMappings, null, 2)
                  }));
                } catch (e) {
                  alert('Please enter valid JSON in the error response field first');
                }
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
          
          {(() => {
            // Check if we have menu selection data available
            // Priority 1: Use previously configured array
            let hasMenuSelection = false;
            
            if (selectedArrayConfig.selectedArray !== null && arrayPreview?.detectedArrays?.length > 0) {
              hasMenuSelection = true;
              console.log('Button detection - using configured array:', selectedArrayConfig.sessionVariable);
            } else {
              // Priority 2: Pattern detection as fallback
              hasMenuSelection = safeAvailableVariables.some(variable => 
                (variable.includes('_menu_') && variable.includes('_items')) ||
                (variable.includes('items_menu_')) ||
                (variable.includes('menu') && variable.includes('items')) ||
                (variable.includes('_menu_'))
              );
              console.log('Button detection - pattern-based detection:', hasMenuSelection);
            }
            
            console.log('Button detection - hasMenuSelection:', hasMenuSelection);
            console.log('Button detection - selectedArrayConfig:', selectedArrayConfig);
            console.log('Button detection - arrayPreview:', arrayPreview);
            
            // Check if any fields are using selectedItem.* session variables (generic or API-specific)
            const hasSessionFields = requestMapping.some(field => 
              field.mappingType === 'session' && field.storeAttribute && 
              (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
            );
            
            console.log('🔍 Button detection - hasSessionFields:', hasSessionFields);
            console.log('🔍 Button detection - all session fields:', requestMapping.filter(f => f.mappingType === 'session'));
            console.log('🔍 Button detection - requestMapping details:', requestMapping.map(f => ({
              path: f.path,
              mappingType: f.mappingType,
              storeAttribute: f.storeAttribute,
              hasSelectedItem: f.storeAttribute?.includes('selectedItem.')
            })));
            console.log('🔍 Button detection - will show session-aware button:', hasMenuSelection && hasSessionFields);
            
            if (hasMenuSelection && hasSessionFields) {
              return (
                <button 
                  onClick={generateSessionAwareJoltSpecs} 
                  className="btn primary session-aware-btn"
                  disabled={!responseMapping.generated || !errorMapping.generated}
                >
                  🎯 Generate Session-Aware Template (Menu Selection) →
                </button>
              );
            } else {
              return (
                <button 
                  onClick={generateJoltSpecs} 
                  className="btn primary"
                  disabled={!responseMapping.generated || !errorMapping.generated}
                >
                  Next: Generate Complete Template →
                </button>
              );
            }
          })()}
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

  // Simple, clean return statement like the working example - rendered with Portal
  return createPortal(
    <TemplateCreatorErrorBoundary>
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
    </TemplateCreatorErrorBoundary>,
    document.body
  );
};

export default TemplateCreator;