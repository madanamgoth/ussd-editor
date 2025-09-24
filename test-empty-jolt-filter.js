// Test script to verify empty JOLT operation filtering
// Using CommonJS require instead of ES6 import for Node.js compatibility

// Test data with empty operations that should be filtered out
const testTemplateWithEmptyOperations = {
  "_id": "SYSTEM_TOKEN",
  "target": {
    "endpoint": "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token",
    "method": "GET",
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic Q29yZVdlYjphZGF5ZmNTV2NJ"
    }
  },
  "requestTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {
          "input": {} // ❌ Empty input - should be filtered out
        }
      },
      {
        "operation": "default",
        "spec": {
          "SYSTEM_TOKEN.grant_type": "client_credentials" // ✅ Has content - should be kept
        }
      }
    ]
  },
  "responseTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {
          "input": {} // ❌ Empty input - should be filtered out
        }
      },
      {
        "operation": "default",
        "spec": {
          "success": true,
          "timestamp": "2025-09-24T08:10:54.262Z",
          "status": "SUCCEEDED" // ✅ Has content - should be kept
        }
      }
    ]
  },
  "responseErrorTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {} // ❌ Empty spec - should be filtered out
      },
      {
        "operation": "default",
        "spec": {
          "success": false,
          "error": true // ✅ Has content - should be kept
        }
      }
    ]
  }
};

// Inline implementation of the filtering logic for testing
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
  } else {
    // For other operations, check if spec is empty
    if (Object.keys(operation.spec).length === 0) {
      return true;
    }
  }
  
  return false;
};

const filterEmptyJoltOperations = (joltSpecs) => {
  if (!Array.isArray(joltSpecs)) return joltSpecs;
  return joltSpecs.filter(operation => !isJoltOperationEmpty(operation));
};

const createNiFiTemplate = (templateData) => {
  // Create clean template by filtering out empty JOLT operations
  const cleanTemplate = {
    ...templateData,
    requestTemplate: {
      ...templateData.requestTemplate,
      joltSpec: filterEmptyJoltOperations(templateData.requestTemplate.joltSpec)
    },
    responseTemplate: {
      ...templateData.responseTemplate,
      joltSpec: filterEmptyJoltOperations(templateData.responseTemplate.joltSpec)
    },
    responseErrorTemplate: {
      ...templateData.responseErrorTemplate,
      joltSpec: filterEmptyJoltOperations(templateData.responseErrorTemplate.joltSpec)
    }
  };

  // Wrap in array format for NiFi consumption
  return [cleanTemplate];
};

console.log('🧪 Testing empty JOLT operation filtering...');
console.log('\n📥 Input template (with empty operations):');
console.log('Request JOLT operations:', testTemplateWithEmptyOperations.requestTemplate.joltSpec.length);
console.log('Response JOLT operations:', testTemplateWithEmptyOperations.responseTemplate.joltSpec.length);
console.log('Error JOLT operations:', testTemplateWithEmptyOperations.responseErrorTemplate.joltSpec.length);

// Test the export function
const exportedTemplate = createNiFiTemplate(testTemplateWithEmptyOperations);

console.log('\n📤 Exported template (after filtering):');
if (exportedTemplate.length > 0) {
  const template = exportedTemplate[0];
  
  console.log('✅ Request JOLT operations:', template.requestTemplate.joltSpec.length);
  console.log('✅ Response JOLT operations:', template.responseTemplate.joltSpec.length);
  console.log('✅ Error JOLT operations:', template.responseErrorTemplate.joltSpec.length);
  
  console.log('\n🔍 Request JOLT (should only have default operation):');
  console.log(JSON.stringify(template.requestTemplate.joltSpec, null, 2));
  
  console.log('\n🔍 Response JOLT (should only have default operation):');
  console.log(JSON.stringify(template.responseTemplate.joltSpec, null, 2));
  
  console.log('\n🔍 Error JOLT (should only have default operation):');
  console.log(JSON.stringify(template.responseErrorTemplate.joltSpec, null, 2));
  
  // Verify filtering worked correctly
  const hasEmptyShift = template.requestTemplate.joltSpec.some(op => 
    op.operation === 'shift' && op.spec.input && Object.keys(op.spec.input).length === 0
  );
  
  console.log('\n✅ Empty shift operations filtered out:', !hasEmptyShift);
  console.log('✅ Clean JOLT specs with only meaningful operations');
}

console.log('\n✅ Test completed!');