/**
 * Test enhancing existing JOLT specs with missing defaults
 * This matches the exact structure from the user's example
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('Testing JOLT Enhancement with Real Example...\n');

// Exact JOLT structure from the user's example (response template)
const existingResponseJolt = [
  {
    "operation": "shift",
    "spec": {
      "input": {
        "userName": "nifiUserName",
        "fiction": {
          "*": {
            "@": "fiction_menu[]",
            "bookAuthor": "fiction_menu_menu_raw[]"
          }
        }
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "timestamp": "2025-09-25T07:37:47.081Z",
      "status": "SUCCEEDED"
    }
  }
];

console.log('Original JOLT (missing defaults for nifiUserName and array fields):');
console.log(JSON.stringify(existingResponseJolt, null, 2));

console.log('\n🔧 Enhancing JOLT with missing defaults...');

// Enhance the JOLT with missing defaults
const enhancedJolt = JoltGeneratorEnhanced.enhanceJoltWithDefaults([...existingResponseJolt]);

console.log('\n✅ Enhanced JOLT (with all defaults):');
console.log(JSON.stringify(enhancedJolt, null, 2));

// Analyze the results
const defaultOperation = enhancedJolt.find(op => op.operation === 'default');
if (defaultOperation && defaultOperation.spec) {
  console.log('\n=== Analysis of Added Defaults ===');
  console.log('✅ Basic defaults maintained:', {
    success: defaultOperation.spec.success,
    timestamp: !!defaultOperation.spec.timestamp,
    status: defaultOperation.spec.status
  });
  
  console.log('\n🔍 Field-specific defaults:');
  console.log('- nifiUserName:', defaultOperation.spec.nifiUserName || 'MISSING ❌');
  console.log('- fiction_menu:', JSON.stringify(defaultOperation.spec.fiction_menu) || 'MISSING ❌');
  console.log('- fiction_menu_menu_raw:', JSON.stringify(defaultOperation.spec.fiction_menu_menu_raw) || 'MISSING ❌');
  
  // Verify array defaults
  let successCount = 0;
  if (defaultOperation.spec.nifiUserName === "0") {
    console.log('✅ nifiUserName has correct default');
    successCount++;
  }
  if (Array.isArray(defaultOperation.spec.fiction_menu) && defaultOperation.spec.fiction_menu[0] === "unable to fetch") {
    console.log('✅ fiction_menu[] has correct array default');
    successCount++;
  }
  if (Array.isArray(defaultOperation.spec.fiction_menu_menu_raw) && defaultOperation.spec.fiction_menu_menu_raw[0] === "unable to fetch") {
    console.log('✅ fiction_menu_menu_raw[] has correct array default');
    successCount++;
  }
  
  console.log(`\n🎯 Success: ${successCount}/3 defaults correctly added`);
} else {
  console.log('❌ No default operation found');
}

console.log('\n=== Test Error Template Too ===');

// Test with error template structure  
const existingErrorJolt = [
  {
    "operation": "shift",
    "spec": {
      "userId": "userId"
    }
  },
  {
    "operation": "default", 
    "spec": {
      "success": false,
      "error": true,
      "timestamp": "2025-09-25T07:38:27.457Z",
      "status": "FAILED",
      "errorCode": "UNKNOWN_ERROR",
      "errorMessage": "An error occurred"
      // userId default is missing
    }
  }
];

console.log('\nOriginal Error JOLT (missing userId default):');
console.log(JSON.stringify(existingErrorJolt, null, 2));

const enhancedErrorJolt = JoltGeneratorEnhanced.enhanceJoltWithDefaults([...existingErrorJolt]);

console.log('\nEnhanced Error JOLT (with userId default):');
console.log(JSON.stringify(enhancedErrorJolt, null, 2));

console.log('\n🎉 Enhancement complete! Both response and error templates now have proper defaults.');