// Template Manager Utility
// Handles template file operations like save, load, download, and auto-save

/**
 * Download template as JSON file
 * @param {Object} templateData - Template data to download
 * @returns {Object} Operation result
 */
export const downloadTemplate = (templateData) => {
  try {
    const fileName = `${templateData._id || 'api-template'}-${Date.now()}.json`;
    const jsonString = JSON.stringify(templateData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('✅ Template downloaded successfully:', fileName);
    return {
      success: true,
      fileName: fileName,
      message: `Template downloaded as ${fileName}`
    };
  } catch (error) {
    console.error('❌ Error downloading template:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to download template'
    };
  }
};

/**
 * Auto-save template to localStorage
 * @param {Object} templateData - Template data to save
 * @returns {Object} Operation result
 */
export const autoSaveTemplate = (templateData) => {
  try {
    const storageKey = 'ussd-api-templates';
    
    // Get existing templates
    const existingTemplates = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Find existing template by ID or create new one
    const existingIndex = existingTemplates.findIndex(t => t._id === templateData._id);
    
    if (existingIndex >= 0) {
      // Update existing template
      existingTemplates[existingIndex] = {
        ...templateData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new template
      existingTemplates.push({
        ...templateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(existingTemplates));
    
    console.log('✅ Template auto-saved to localStorage:', templateData._id);
    return {
      success: true,
      message: 'Template saved to browser storage',
      templateId: templateData._id
    };
  } catch (error) {
    console.error('❌ Error auto-saving template:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to save template to browser storage'
    };
  }
};

/**
 * Load template from uploaded file
 * @param {File} file - Uploaded file object
 * @returns {Promise<Object>} Template data or error
 */
export const loadTemplateFromFile = (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }
      
      if (!file.name.endsWith('.json')) {
        reject(new Error('File must be a JSON file'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const templateData = JSON.parse(event.target.result);
          
          // Validate template structure
          if (!templateData._id || !templateData.target) {
            reject(new Error('Invalid template format: missing required fields'));
            return;
          }
          
          console.log('✅ Template loaded from file:', templateData._id);
          resolve({
            success: true,
            template: templateData,
            message: `Template "${templateData._id}" loaded successfully`
          });
        } catch (parseError) {
          console.error('❌ Error parsing template file:', parseError);
          reject(new Error('Invalid JSON format in template file'));
        }
      };
      
      reader.onerror = () => {
        console.error('❌ Error reading template file');
        reject(new Error('Failed to read template file'));
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('❌ Error loading template from file:', error);
      reject(error);
    }
  });
};

/**
 * Get all saved templates from localStorage
 * @returns {Array} Array of saved templates
 */
export const getSavedTemplates = () => {
  try {
    const storageKey = 'ussd-api-templates';
    const templates = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    console.log(`📋 Retrieved ${templates.length} saved templates`);
    return templates;
  } catch (error) {
    console.error('❌ Error retrieving saved templates:', error);
    return [];
  }
};

/**
 * Delete template from localStorage
 * @param {string} templateId - ID of template to delete
 * @returns {Object} Operation result
 */
export const deleteTemplate = (templateId) => {
  try {
    const storageKey = 'ussd-api-templates';
    const templates = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const filteredTemplates = templates.filter(t => t._id !== templateId);
    
    if (filteredTemplates.length === templates.length) {
      return {
        success: false,
        message: 'Template not found'
      };
    }
    
    localStorage.setItem(storageKey, JSON.stringify(filteredTemplates));
    
    console.log('✅ Template deleted:', templateId);
    return {
      success: true,
      message: `Template "${templateId}" deleted successfully`
    };
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to delete template'
    };
  }
};

/**
 * Export all templates as a single JSON file
 * @returns {Object} Operation result
 */
export const exportAllTemplates = () => {
  try {
    const templates = getSavedTemplates();
    
    if (templates.length === 0) {
      return {
        success: false,
        message: 'No templates to export'
      };
    }
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      templates: templates
    };
    
    const fileName = `ussd-api-templates-export-${Date.now()}.json`;
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('✅ All templates exported:', fileName);
    return {
      success: true,
      fileName: fileName,
      count: templates.length,
      message: `${templates.length} templates exported as ${fileName}`
    };
  } catch (error) {
    console.error('❌ Error exporting templates:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to export templates'
    };
  }
};

/**
 * Import templates from uploaded export file
 * @param {File} file - Uploaded export file
 * @returns {Promise<Object>} Import result
 */
export const importTemplatesFromFile = (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file || !file.name.endsWith('.json')) {
        reject(new Error('File must be a JSON file'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          // Validate import format
          if (!importData.templates || !Array.isArray(importData.templates)) {
            reject(new Error('Invalid import format: missing templates array'));
            return;
          }
          
          const storageKey = 'ussd-api-templates';
          const existingTemplates = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          let importedCount = 0;
          let skippedCount = 0;
          
          importData.templates.forEach(template => {
            // Check if template already exists
            const existingIndex = existingTemplates.findIndex(t => t._id === template._id);
            
            if (existingIndex >= 0) {
              // Update existing template
              existingTemplates[existingIndex] = {
                ...template,
                updatedAt: new Date().toISOString()
              };
              importedCount++;
            } else {
              // Add new template
              existingTemplates.push({
                ...template,
                importedAt: new Date().toISOString()
              });
              importedCount++;
            }
          });
          
          // Save updated templates
          localStorage.setItem(storageKey, JSON.stringify(existingTemplates));
          
          console.log(`✅ Templates imported: ${importedCount}, skipped: ${skippedCount}`);
          resolve({
            success: true,
            imported: importedCount,
            skipped: skippedCount,
            message: `${importedCount} templates imported successfully`
          });
        } catch (parseError) {
          console.error('❌ Error parsing import file:', parseError);
          reject(new Error('Invalid JSON format in import file'));
        }
      };
      
      reader.onerror = () => {
        console.error('❌ Error reading import file');
        reject(new Error('Failed to read import file'));
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('❌ Error importing templates:', error);
      reject(error);
    }
  });
};

export default {
  downloadTemplate,
  autoSaveTemplate,
  loadTemplateFromFile,
  getSavedTemplates,
  deleteTemplate,
  exportAllTemplates,
  importTemplatesFromFile
};
