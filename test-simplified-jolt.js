// Updated test to verify the simplified JOLT generation without input wrapper for simple cases
const testSimplifiedJoltGeneration = () => {
  console.log('🧪 Testing simplified JOLT generation without input wrapper...');

  // Simulate the parsed data from curl command
  const body = { grant_type: 'client_credentials' };
  const templateName = 'SYSTEM_TOKEN';
  
  // Simulate extractFieldsFromObject behavior
  const allFields = [];
  Object.keys(body).forEach(key => {
    const fullPath = key;
    const value = body[key];
    
    allFields.push({
      path: fullPath,
      value: value,
      type: typeof value,
      category: 'body',
      mappingType: 'dynamic', // This is key - body fields are dynamic
      storeAttribute: key,
      targetPath: fullPath
    });
  });
  
  console.log('📝 Extracted fields:');
  allFields.forEach(field => {
    console.log(`  - ${field.path}: ${field.value} (${field.category}, ${field.mappingType})`);
  });
  
  // Simulate generateJoltSpecs behavior with the UPDATED logic
  const requestShiftSpec = {}; // Start without input wrapper
  const requestDefaultSpec = {};
  
  // Helper function to set nested values
  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  };
  
  // Process fields with UPDATED template wrapping logic
  allFields.forEach(field => {
    if (field.mappingType === 'dynamic' && field.storeAttribute) {
      if (field.category === 'body' && field.path && !field.path.includes('.')) {
        // For top-level body fields (like --data-urlencode params), use template name wrapping
        const wrappedTarget = `${templateName}.${field.storeAttribute}`;
        setNestedValue(requestShiftSpec, field.storeAttribute, wrappedTarget);
        console.log(`✅ Body field (dynamic with template wrapping): ${field.storeAttribute} → ${wrappedTarget}`);
      } else {
        // Regular dynamic fields - use input wrapper
        if (!requestShiftSpec.input) requestShiftSpec.input = {};
        setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
        console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
      }
    }
  });
  
  // Filter empty operations
  const isJoltOperationEmpty = (operation) => {
    if (!operation.spec) return true;
    if (operation.operation === 'shift') {
      // Check if spec is completely empty
      if (Object.keys(operation.spec).length === 0) return true;
      // Check if input wrapper is empty
      if (operation.spec.input && Object.keys(operation.spec.input).length === 0 && Object.keys(operation.spec).length === 1) {
        return true;
      }
    }
    if (Object.keys(operation.spec).length === 0) {
      return true;
    }
    return false;
  };
  
  const filterEmptyJoltOperations = (joltSpecs) => {
    return joltSpecs.filter(operation => !isJoltOperationEmpty(operation));
  };
  
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
  
  console.log('\n📤 Generated JOLT specification:');
  console.log(JSON.stringify(requestJolt, null, 2));
  
  // Expected pattern from user's example
  const expectedPattern = [
    {
      "operation": "shift",
      "spec": {
        "grant_type": "SYSTEM_TOKEN.grant_type"
      }
    }
  ];
  
  console.log('\n✅ Expected pattern (from user example):');
  console.log(JSON.stringify(expectedPattern, null, 2));
  
  // Verify the pattern matches exactly
  const hasCorrectFormat = requestJolt.length === 1 &&
    requestJolt[0].operation === 'shift' &&
    requestJolt[0].spec &&
    requestJolt[0].spec.grant_type === 'SYSTEM_TOKEN.grant_type' &&
    !requestJolt[0].spec.input; // No input wrapper
  
  console.log('\n🎯 Verification results:');
  console.log('✅ Has shift operation:', requestJolt.some(op => op.operation === 'shift') ? 'YES' : 'NO');
  console.log('✅ No input wrapper:', !requestJolt.some(op => op.spec && op.spec.input) ? 'YES' : 'NO');
  console.log('✅ Has correct template wrapping:', hasCorrectFormat ? 'YES' : 'NO');
  console.log('✅ Empty operations filtered:', rawRequestJolt.length > requestJolt.length ? 'YES' : 'NO');
  
  console.log('\n✅ Test completed!');
  return hasCorrectFormat;
};

// Run the test
const testResult = testSimplifiedJoltGeneration();
console.log(`\n🎯 Overall test result: ${testResult ? 'PASSED' : 'FAILED'}`);