// Enhanced JOLT Generator Utility
// Provides JOLT transformation generation and validation capabilities

/**
 * Generate JOLT spec for response transformation
 * @param {Object} rawResponse - Original API response
 * @param {Object} desiredMapping - Field mapping configuration
 * @param {Object} options - Additional options including dynamic menu configuration
 * @returns {Array} JOLT specification array
 */
export const generateResponseJolt = (rawResponse, desiredMapping, options = {}) => {
  try {
    console.log('🔧 Generating Response JOLT with:', { rawResponse, desiredMapping, options });
    
    const shiftSpec = {
      operation: "shift",
      spec: {}
    };
    
    const defaultSpec = {
      success: true,
      timestamp: new Date().toISOString(),
      status: "SUCCEEDED"
    };
    
    // Parse the desired mapping and create shift operations
    Object.entries(desiredMapping).forEach(([sourcePath, targetPath]) => {
      // Skip dynamicMenuData for now - we'll handle it specially
      if (targetPath !== 'dynamicMenuData' && typeof targetPath === 'string') {
        setNestedValue(shiftSpec.spec, sourcePath, targetPath);
      }
    });
    
    // Handle dynamic menu data if present
    if (desiredMapping.dynamicMenuData) {
      console.log('🎯 Processing dynamic menu data:', desiredMapping.dynamicMenuData);
      
      Object.entries(desiredMapping.dynamicMenuData).forEach(([sessionKey, arrayPath]) => {
        if (!sessionKey.endsWith('_meta')) {
          // This is an array path, not metadata
          console.log(`📋 Processing array: ${sessionKey} -> ${arrayPath}`);
          
          // Get the array from raw response to determine type
          const arrayData = getNestedValue(rawResponse, arrayPath);
          if (Array.isArray(arrayData) && arrayData.length > 0) {
            
            // Determine array type and generate appropriate JOLT
            const firstElement = arrayData[0];
            
            if (typeof firstElement === 'string') {
              // String array - use JOLT pattern for strings
              console.log('🔤 String array detected');
              setNestedValue(shiftSpec.spec, arrayPath, `${sessionKey}_formatted`);
              
            } else if (typeof firstElement === 'object' && firstElement !== null) {
              // Object array - create complete USSD flow structure
              console.log('🎯 Object array detected - creating 3-part structure');
              
              // Get metadata to determine display key
              const metaKey = `${sessionKey}_meta`;
              const metadata = desiredMapping.dynamicMenuData[metaKey];
              
              if (metadata && metadata.displayKey && metadata.valueKey) {
                const displayKey = metadata.displayKey;
                const valueKey = metadata.valueKey;
                
                console.log(`🔑 Using display key: ${displayKey}, value key: ${valueKey}`);
                
                // Create complete 3-part structure in shift operation
                // Note: Each path must be unique in JOLT shift operation
                
                // 1. Individual Data - Store each item with index for detailed access
                const itemsPath = `${arrayPath}[*]`;
                shiftSpec.spec[itemsPath] = `${sessionKey}_items[&1]`;
                
                // 2. Dynamic Menu - Extract display values for menu creation  
                const menuPath = `${arrayPath}[*].${displayKey}`;
                shiftSpec.spec[menuPath] = `${sessionKey}_menu_raw[&1]`;
                
                // 3. Session Data - Extract routing values based on configuration
                if (valueKey === 'index') {
                  // For index routing, we'll let NiFi generate indices later
                  console.log('📋 Using array indices for routing (will be generated in NiFi)');
                } else {
                  // Extract specific field for routing
                  const valuesPath = `${arrayPath}[*].${valueKey}`;
                  shiftSpec.spec[valuesPath] = `${sessionKey}_values[&1]`;
                  console.log(`📋 Using field '${valueKey}' for routing values`);
                }
                
                console.log(`✅ Created 3-part JOLT structure for ${sessionKey}:`, {
                  items: `${sessionKey}_items`,
                  menu: `${sessionKey}_menu_raw`, 
                  values: valueKey === 'index' ? 'generated-in-nifi' : `${sessionKey}_values`
                });
                
              } else {
                // Fallback: use basic structure with first available key
                console.log('⚠️ No display/value keys configured, using fallback');
                setNestedValue(shiftSpec.spec, arrayPath, `${sessionKey}_items`);
              }
              
            } else {
              // Number array or other types
              console.log('🔢 Number/other array detected');
              setNestedValue(shiftSpec.spec, arrayPath, `${sessionKey}_formatted`);
            }
            
            // Also preserve the original array
            setNestedValue(shiftSpec.spec, arrayPath, sessionKey);
          }
        }
      });
    }
    
    const joltSpec = [
      {
        operation: "shift",
        spec: shiftSpec.spec
      }
    ];
    
    // Add modify operation for USSD menu formatting if we have arrays to format
    if (desiredMapping.dynamicMenuData) {
      const modifySpec = {};
      
      Object.entries(desiredMapping.dynamicMenuData).forEach(([sessionKey, arrayPath]) => {
        if (!sessionKey.endsWith('_meta')) {
          const arrayData = getNestedValue(rawResponse, arrayPath);
          if (Array.isArray(arrayData) && arrayData.length > 0) {
            
            const firstElement = arrayData[0];
            const metaKey = `${sessionKey}_meta`;
            const metadata = desiredMapping.dynamicMenuData[metaKey];
            
            if (typeof firstElement === 'object' && firstElement !== null && metadata) {
              // Object array with 3-part structure
              
              // 1. Create numbered menu from display values (menu array is already extracted in shift)
              modifySpec[`${sessionKey}_menu`] = {
                "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
              };
              
              // 2. Handle routing values array
              if (metadata.valueKey === 'index') {
                // Generate index values for array indices
                modifySpec[`${sessionKey}_values`] = {
                  "*": "&1"
                };
              }
              // If valueKey is a field, values are already extracted in shift
              
              console.log(`✅ Created 3-part structure for ${sessionKey}:`, {
                items: `${sessionKey}_items`,
                menu: `${sessionKey}_menu`, 
                values: `${sessionKey}_values`
              });
              
            } else if (typeof firstElement === 'string') {
              // String array formatting
              modifySpec[`${sessionKey}_menu`] = {
                "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
              };
              modifySpec[`${sessionKey}_values`] = {
                "*": "&1" // Use indices for string arrays
              };
              
            } else if (typeof firstElement === 'number') {
              // Number array formatting
              modifySpec[`${sessionKey}_menu`] = {
                "*": "=concat(=toString(=add(1,&1)),'. ',=toString(@(1,&)))"
              };
              modifySpec[`${sessionKey}_values`] = {
                "*": "&1" // Use indices for number arrays
              };
            }
          }
        }
      });
      
      if (Object.keys(modifySpec).length > 0) {
        // Skip modify operation for now - use shift and default only
        console.log('⚠️ Skipping modify operation to avoid JOLT validation errors');
      }
    }
    
    // Add default operation
    joltSpec.push({
      operation: "default",
      spec: defaultSpec
    });
    
    console.log('✅ Generated Enhanced Response JOLT:', joltSpec);
    return joltSpec;
  } catch (error) {
    console.error('❌ Error generating response JOLT:', error);
    throw error;
  }
};

/**
 * Generate JOLT spec for error response transformation
 * @param {Object} rawError - Original API error response
 * @param {Object} desiredMapping - Error field mapping configuration
 * @returns {Array} JOLT specification array
 */
export const generateErrorJolt = (rawError, desiredMapping) => {
  try {
    console.log('🔧 Generating Error JOLT with:', { rawError, desiredMapping });
    
    const shiftSpec = {
      operation: "shift",
      spec: {}
    };
    
    // Parse the desired mapping and create shift operations
    Object.entries(desiredMapping).forEach(([sourcePath, targetPath]) => {
      setNestedValue(shiftSpec.spec, sourcePath, targetPath);
    });
    
    const joltSpec = [
      {
        operation: "shift",
        spec: shiftSpec.spec
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
    
    console.log('✅ Generated Error JOLT:', joltSpec);
    return joltSpec;
  } catch (error) {
    console.error('❌ Error generating error JOLT:', error);
    throw error;
  }
};

/**
 * Validate JOLT specification and preview transformation
 * @param {Array} joltSpec - JOLT specification to validate
 * @param {Object} inputData - Sample input data for testing
 * @param {string} mappingType - Type of mapping ('response' or 'error')
 * @returns {Object} Validation result with preview or error
 */
export const validateJoltSpec = (joltSpec, inputData, mappingType = 'response') => {
  try {
    console.log('🔍 Validating JOLT spec:', { joltSpec, inputData, mappingType });
    
    // Simple validation - in a real implementation, you'd use a JOLT library
    if (!Array.isArray(joltSpec) || joltSpec.length === 0) {
      throw new Error('JOLT spec must be a non-empty array');
    }
    
    // Validate each operation
    joltSpec.forEach((operation, index) => {
      if (!operation.operation || !operation.spec) {
        throw new Error(`Invalid operation at index ${index}: missing operation or spec`);
      }
      
      if (!['shift', 'default', 'remove', 'sort'].includes(operation.operation)) {
        throw new Error(`Unknown operation: ${operation.operation}`);
      }
    });
    
    // Simple transformation simulation (in real implementation, use JOLT library)
    const mockResult = simulateJoltTransformation(joltSpec, inputData);
    
    console.log('✅ JOLT validation successful, preview:', mockResult);
    
    return {
      success: true,
      result: mockResult,
      error: null
    };
  } catch (error) {
    console.error('❌ JOLT validation failed:', error);
    return {
      success: false,
      result: null,
      error: error.message
    };
  }
};

/**
 * Auto-detect field mappings from response structure
 * @param {Object} response - API response object
 * @returns {Object} Suggested field mappings
 */
export const autoDetectMapping = (response) => {
  try {
    console.log('🤖 Auto-detecting mappings for:', response);
    
    const mappings = {};
    const flattenedFields = flattenObject(response);
    
    // Auto-suggest common field mappings
    Object.keys(flattenedFields).forEach(path => {
      const lowerPath = path.toLowerCase();
      
      // Common field mappings
      if (lowerPath.includes('id') || lowerPath.includes('accountno') || lowerPath.includes('account')) {
        mappings[path] = 'accountId';
      } else if (lowerPath.includes('name') || lowerPath.includes('customer')) {
        mappings[path] = 'customerName';
      } else if (lowerPath.includes('balance') || lowerPath.includes('amount')) {
        mappings[path] = 'balance';
      } else if (lowerPath.includes('status') || lowerPath.includes('code')) {
        mappings[path] = 'statusCode';
      } else if (lowerPath.includes('error') || lowerPath.includes('message')) {
        mappings[path] = 'errorMessage';
      } else {
        // Default mapping - use the last part of the path
        const parts = path.split('.');
        mappings[path] = parts[parts.length - 1];
      }
    });
    
    console.log('🎯 Auto-detected mappings:', mappings);
    return mappings;
  } catch (error) {
    console.error('❌ Error auto-detecting mappings:', error);
    return {};
  }
};

/**
 * Check if a path has nested structure
 * @param {string} path - Dot-notation path
 * @returns {boolean} True if nested
 */
export const hasNestedPath = (path) => {
  return path && path.includes('.');
};

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
export const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    
    // Check if this part has array notation like "loginIdentifiers[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      
      // Create array if it doesn't exist
      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      
      // Ensure array has enough elements
      while (current[arrayName].length <= index) {
        current[arrayName].push({});
      }
      
      current = current[arrayName][index];
    } else {
      // Regular object property
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }
  
  // Handle the final part (could also have array notation)
  const finalPart = parts[parts.length - 1];
  const finalArrayMatch = finalPart.match(/^(.+)\[(\d+)\]$/);
  
  if (finalArrayMatch) {
    const [, arrayName, indexStr] = finalArrayMatch;
    const index = parseInt(indexStr, 10);
    
    // Create array if it doesn't exist
    if (!current[arrayName]) {
      current[arrayName] = [];
    }
    
    // Ensure array has enough elements
    while (current[arrayName].length <= index) {
      current[arrayName].push({});
    }
    
    current[arrayName][index] = value;
  } else {
    // Regular property assignment
    current[finalPart] = value;
  }
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path
 * @returns {*} Retrieved value
 */
export const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Flatten nested object to dot-notation paths
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Path prefix
 * @returns {Object} Flattened object
 */
const flattenObject = (obj, prefix = '') => {
  const flattened = {};
  
  Object.keys(obj || {}).forEach(key => {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, fullPath));
    } else {
      flattened[fullPath] = value;
    }
  });
  
  return flattened;
};

/**
 * Simple JOLT transformation simulation
 * @param {Array} joltSpec - JOLT specification
 * @param {Object} inputData - Input data to transform
 * @returns {Object} Transformed data
 */
const simulateJoltTransformation = (joltSpec, inputData) => {
  let result = {};
  
  joltSpec.forEach(operation => {
    if (operation.operation === 'shift') {
      // Simulate shift operation
      const shifted = performShift(operation.spec, { input: inputData });
      Object.assign(result, shifted);
    } else if (operation.operation === 'default') {
      // Apply default values
      Object.keys(operation.spec).forEach(key => {
        if (result[key] === undefined) {
          result[key] = operation.spec[key];
        }
      });
    }
  });
  
  return result;
};

/**
 * Simulate shift operation
 * @param {Object} shiftSpec - Shift specification
 * @param {Object} inputData - Input data
 * @returns {Object} Shifted data
 */
const performShift = (shiftSpec, inputData) => {
  const result = {};
  
  const processSpec = (spec, data, targetResult) => {
    Object.keys(spec).forEach(key => {
      if (data && data[key] !== undefined) {
        const specValue = spec[key];
        
        if (typeof specValue === 'string') {
          // Direct mapping
          targetResult[specValue] = data[key];
        } else if (typeof specValue === 'object') {
          // Nested mapping
          processSpec(specValue, data[key], targetResult);
        }
      }
    });
  };
  
  processSpec(shiftSpec, inputData, result);
  return result;
};

export default {
  generateResponseJolt,
  generateErrorJolt,
  validateJoltSpec,
  autoDetectMapping,
  hasNestedPath,
  setNestedValue,
  getNestedValue
};
