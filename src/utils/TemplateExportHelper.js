/**
 * Template Export Helper
 * Utilities to manage what gets exported to NiFi vs what stays in the graph editor
 */

/**
 * Create a clean template for NiFi export (removes graph editor metadata)
 * @param {Object} templateData - Full template data with metadata
 * @returns {Array} Clean template wrapped in array for NiFi consumption
 */
export const createNiFiTemplate = (templateData) => {
  // Helper function to add input wrapper to shift operations if missing
  const addInputWrapperToJoltSpec = (joltSpec) => {
    if (!Array.isArray(joltSpec)) return [];
    
    return joltSpec.map(operation => {
      if (operation.operation === 'shift' && operation.spec) {
        // Check if the spec already has an "input" wrapper
        const hasInputWrapper = operation.spec.hasOwnProperty('input');
        
        if (!hasInputWrapper) {
          // Wrap the existing spec in "input"
          return {
            ...operation,
            spec: {
              input: operation.spec
            }
          };
        }
      }
      // Return unchanged for non-shift operations or already wrapped operations
      return operation;
    });
  };

  const cleanTemplate = {
    ...templateData,
    requestTemplate: {
      joltSpec: templateData.requestTemplate?.joltSpec || []
    },
    responseTemplate: {
      joltSpec: addInputWrapperToJoltSpec(templateData.responseTemplate?.joltSpec || [])
      // Note: responseMapping is excluded - it's only for graph editor field extraction
    },
    responseErrorTemplate: {
      joltSpec: addInputWrapperToJoltSpec(templateData.responseErrorTemplate?.joltSpec || [])
    }
  };
  
  // Preserve dynamic menu fields for USSD flow integration
  if (templateData.templateId) {
    cleanTemplate.templateId = templateData.templateId;
  }
  if (templateData.sessionSpec) {
    cleanTemplate.sessionSpec = templateData.sessionSpec;
  }
  if (templateData.menuName) {
    cleanTemplate.menuName = templateData.menuName;
  }
  if (templateData.menuJolt) {
    cleanTemplate.menuJolt = templateData.menuJolt;
  }
  if (templateData.isNextMenuDynamic) {
    cleanTemplate.isNextMenuDynamic = templateData.isNextMenuDynamic;
  }
  
  // Return as array instead of single object
  return [cleanTemplate];
};

/**
 * Check if a template has graph editor metadata
 * @param {Object} templateData - Template to check
 * @returns {boolean} True if contains metadata
 */
export const hasGraphMetadata = (templateData) => {
  return !!(templateData.responseTemplate?.responseMapping);
};

/**
 * Get template size comparison (with vs without metadata)
 * @param {Object} templateData - Full template data
 * @returns {Object} Size information
 */
export const getTemplateSizeInfo = (templateData) => {
  const fullSize = JSON.stringify(templateData).length;
  const cleanTemplateArray = createNiFiTemplate(templateData);
  const cleanSize = JSON.stringify(cleanTemplateArray).length;
  
  return {
    fullSize,
    cleanSize,
    metadataSize: fullSize - cleanSize,
    percentReduction: Math.round(((fullSize - cleanSize) / fullSize) * 100)
  };
};

/**
 * Validate that a template is ready for NiFi export
 * @param {Object} templateData - Template to validate
 * @returns {Object} Validation result
 */
export const validateForNiFiExport = (templateData) => {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!templateData._id) {
    errors.push('Template must have an _id');
  }
  
  if (!templateData.target?.endpoint) {
    errors.push('Template must have a target endpoint');
  }
  
  if (!templateData.requestTemplate?.joltSpec?.length) {
    warnings.push('Request template has no JOLT transformations');
  }
  
  if (!templateData.responseTemplate?.joltSpec?.length) {
    warnings.push('Response template has no JOLT transformations');
  }
  
  // Check for metadata
  if (hasGraphMetadata(templateData)) {
    warnings.push('Template contains graph editor metadata (will be removed in export)');
  }
  
  const cleanTemplateArray = createNiFiTemplate(templateData);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanTemplate: cleanTemplateArray
  };
};

export default {
  createNiFiTemplate,
  hasGraphMetadata,
  getTemplateSizeInfo,
  validateForNiFiExport
};