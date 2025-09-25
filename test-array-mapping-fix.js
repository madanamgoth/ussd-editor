/**
 * Test the correct array field mapping pattern
 * This shows what the Template Creator should build for array fields
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('🔧 Testing Array Field Mapping Patterns...\n');

const rawResponse = {
  profileDetails: {
    authProfile: "1234"
  },
  userInformation: {
    basicInformation: {
      loginIdentifiers: [
        {
          type: "Pride and Prejudice",
          value: "Jane Austen"
        }
      ]
    }
  }
};

console.log('📋 Raw Response:', JSON.stringify(rawResponse, null, 2));

// PROBLEM: Current mapping pattern (generates @)
console.log('\n❌ CURRENT INCORRECT PATTERN:');
const currentPattern = {
  "profileDetails.authProfile": "nifiAutoProfile",
  "userInformation.basicInformation.loginIdentifiers.*": "userinformation_basicinformation_loginidentifiers_menu[]",
  "userInformation.basicInformation.loginIdentifiers.*.value": "userinformation_basicinformation_loginidentifiers_menu_menu_raw[]"
};

console.log('Mapping:', JSON.stringify(currentPattern, null, 2));

try {
  const currentJolt = JoltGeneratorEnhanced.generateResponseJolt(rawResponse, currentPattern);
  console.log('Generated JOLT:', JSON.stringify(currentJolt[0].spec, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}

// SOLUTION: Correct mapping pattern (should generate field names)
console.log('\n✅ CORRECT PATTERN:');
const correctPattern = {
  "profileDetails.authProfile": "nifiAutoProfile",
  "userInformation.basicInformation.loginIdentifiers.*.type": "userinformation_basicinformation_loginidentifiers_menu[]",
  "userInformation.basicInformation.loginIdentifiers.*.value": "userinformation_basicinformation_loginidentifiers_menu_menu_raw[]"
};

console.log('Mapping:', JSON.stringify(correctPattern, null, 2));

try {
  const correctJolt = JoltGeneratorEnhanced.generateResponseJolt(rawResponse, correctPattern);
  console.log('Generated JOLT:', JSON.stringify(correctJolt[0].spec, null, 2));
  
  // Test transformation
  console.log('\n🧪 Testing transformation...');
  const result = JoltGeneratorEnhanced.performJoltTransformation(correctJolt, rawResponse);
  console.log('Result:', JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('📝 SOLUTION FOR TEMPLATE CREATOR:');
console.log('='.repeat(60));
console.log('When building array field mappings:');
console.log('- Instead of: "path.*" → array_field[]');
console.log('- Use: "path.*.property" → array_field[]');
console.log('');
console.log('The Template Creator should detect array fields and');
console.log('map individual properties, not the whole array element.');