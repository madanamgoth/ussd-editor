// Enhanced JOLT Generator Utility
// Provides JOLT transformation generation and validation capabilities

/**
 * Generate JOLT spec for response transformation
 * @param {Object} rawResponse - Original API response
 * @param {Object} desiredMapping - Field mapping configuration
 * @returns {Array} JOLT specification array
 */
export const generateResponseJolt = (rawResponse, desiredMapping) => {
  try {
    console.log('🔧 Generating Response JOLT with:', { rawResponse, desiredMapping });
    
    const shiftSpec = {
      input: {}
    };
    
    // Parse the desired mapping and create shift operations
    Object.entries(desiredMapping).forEach(([sourcePath, targetPath]) => {
      setNestedValue(shiftSpec.input, sourcePath, targetPath);
    });
    
    const joltSpec = [
      {
        operation: "shift",
        spec: shiftSpec
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
    
    console.log('✅ Generated Response JOLT:', joltSpec);
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
      input: {}
    };
    
    // Parse the desired mapping and create shift operations
    Object.entries(desiredMapping).forEach(([sourcePath, targetPath]) => {
      setNestedValue(shiftSpec.input, sourcePath, targetPath);
    });
    
    const joltSpec = [
      {
        operation: "shift",
        spec: shiftSpec
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
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
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
