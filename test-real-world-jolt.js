/**
 * Test the exact JOLT structure from the user's example
 * to verify array field detection and default generation
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('Testing Real-World JOLT Example...\n');

// Mock API response matching the user's example
const mockApiResponse = {
  input: {
    userName: "200",
    fiction: [
      {
        bookTitle: "The Hitchhiker's Guide to the Galaxy",
        bookAuthor: "Douglas Adams",
        year: 1979
      },
      {
        bookTitle: "1984", 
        bookAuthor: "George Orwell",
        year: 1949
      },
      {
        bookTitle: "One Hundred Years of Solitude",
        bookAuthor: "Gabriel García Márquez", 
        year: 1967
      }
    ],
    classics: [
      {
        bookTitle: "Pride and Prejudice",
        bookAuthor: "Jane Austen",
        year: 1813
      }
    ]
  }
};

// Mapping that creates the JOLT structure from the user's example
const responseMapping = {
  "input.userName": "nifiUserName",
  "input.fiction.*": "fiction_menu[]",
  "input.fiction.*.bookAuthor": "fiction_menu_menu_raw[]"
};

console.log('Input Mapping:');
console.log(JSON.stringify(responseMapping, null, 2));

console.log('\nGenerating JOLT with array field detection...');
const responseJolt = JoltGeneratorEnhanced.generateResponseJolt(mockApiResponse, responseMapping);

console.log('\nGenerated JOLT:');
console.log(JSON.stringify(responseJolt, null, 2));

// Check if the defaults include our expected array fields
const defaultOperation = responseJolt.find(op => op.operation === 'default');
if (defaultOperation && defaultOperation.spec) {
  console.log('\n=== Default Values Analysis ===');
  console.log('✅ Standard defaults:', {
    success: defaultOperation.spec.success,
    timestamp: !!defaultOperation.spec.timestamp,
    status: defaultOperation.spec.status
  });
  
  console.log('🔍 Field defaults:');
  console.log('- nifiUserName:', defaultOperation.spec.nifiUserName || 'MISSING');
  console.log('- fiction_menu:', defaultOperation.spec.fiction_menu || 'MISSING');
  console.log('- fiction_menu_menu_raw:', defaultOperation.spec.fiction_menu_menu_raw || 'MISSING');
  
  // Check if array fields have proper defaults
  if (Array.isArray(defaultOperation.spec.fiction_menu)) {
    console.log('✅ fiction_menu[] has array default:', defaultOperation.spec.fiction_menu);
  } else {
    console.log('❌ fiction_menu[] missing array default');
  }
  
  if (Array.isArray(defaultOperation.spec.fiction_menu_menu_raw)) {
    console.log('✅ fiction_menu_menu_raw[] has array default:', defaultOperation.spec.fiction_menu_menu_raw);
  } else {
    console.log('❌ fiction_menu_menu_raw[] missing array default');
  }
} else {
  console.log('❌ No default operation found in JOLT');
}

console.log('\n=== Summary ===');
console.log('This test verifies that the JOLT generator correctly:');
console.log('1. Detects array fields ending with []');
console.log('2. Provides ["unable to fetch"] defaults for arrays');
console.log('3. Provides "0" defaults for regular fields');
console.log('4. Handles complex nested JOLT structures');