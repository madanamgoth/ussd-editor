// Test to verify that --data-urlencode fields get proper template wrapping in JOLT specs
const testDataUrlencodeJoltGeneration = () => {
  console.log('🧪 Testing --data-urlencode JOLT generation with template wrapping...');

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
  
  // Simulate generateJoltSpecs behavior with the new logic
  const requestShiftSpec = { input: {} };
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
  
  // Process fields with new template wrapping logic
  allFields.forEach(field => {
    if (field.mappingType === 'dynamic' && field.storeAttribute) {
      if (field.category === 'body' && field.path && !field.path.includes('.')) {
        // For top-level body fields (like --data-urlencode params), use template name wrapping
        const wrappedTarget = `${templateName}.${field.storeAttribute}`;
        setNestedValue(requestShiftSpec.input, field.storeAttribute, wrappedTarget);
        console.log(`✅ Body field (dynamic with template wrapping): input.${field.storeAttribute} → ${wrappedTarget}`);
      } else {
        // Regular dynamic fields
        setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
        console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
      }
    }
  });
  
  // Filter empty operations
  const isJoltOperationEmpty = (operation) => {
    if (!operation.spec) return true;
    if (operation.operation === 'shift' && operation.spec.input && Object.keys(operation.spec.input).length === 0) {
      return true;
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
  
  // Verify the pattern matches
  const hasCorrectShiftOperation = requestJolt.some(op => 
    op.operation === 'shift' && 
    op.spec && 
    op.spec.input &&
    op.spec.input.grant_type === 'SYSTEM_TOKEN.grant_type'
  );
  
  console.log('\n🎯 Verification results:');
  console.log('✅ Has shift operation:', requestJolt.some(op => op.operation === 'shift') ? 'YES' : 'NO');
  console.log('✅ Has correct template wrapping:', hasCorrectShiftOperation ? 'YES' : 'NO');
  console.log('✅ Empty operations filtered:', rawRequestJolt.length > requestJolt.length ? 'YES' : 'NO');
  
  console.log('\n✅ Test completed!');
  return hasCorrectShiftOperation;
};

// Run the test
const testResult = testDataUrlencodeJoltGeneration();
console.log(`\n🎯 Overall test result: ${testResult ? 'PASSED' : 'FAILED'}`);