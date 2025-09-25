/**
 * Test to reproduce and fix the JOLT generation issue with nested paths
 * This replicates the exact problem from the user's scenario
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('🔧 Testing JOLT Generation with Nested Paths...\n');

// User's actual API response structure
const rawResponse = {
  profileDetails: {
    authProfile: "1234"
  },
  userInformation: {
    basicInformation: {
      emailId: "200",
      loginIdentifiers: [
        {
          type: "Pride and Prejudice",
          value: "Jane Austen"
        }
      ],
      notificationIdentifiers: [
        {
          type: 1813,
          value: ["Romance", "Classic", "Drama"]
        }
      ],
      allowedDays: "T. Egerton, Whitehall",
      allowedFromTime: "English",
      allowedToTime: 4.5,
      dateOfEmployment: ["Hardcover", "Paperback", "eBook"],
      firstName: "Alaina",
      lastName: "CustomerCare Admin",
      middleName: "Kumar",
      preferredLanguage: "en",
      remarks: "Demo Registration"
    },
    workspaceInformation: {
      categoryCode: "NWADM"
    }
  },
  requestType: "ADMIN-REGISTER"
};

// How the Template Creator is currently building the desired mapping (INCORRECT)
const currentIncorrectMapping = {
  "profileDetails.authProfile": "nifiAutoProfile",
  "userInformation.basicInformation.loginIdentifiers.*": "userinformation_basicinformation_loginidentifiers_menu[]",
  "userInformation.basicInformation.loginIdentifiers.*.value": "userinformation_basicinformation_loginidentifiers_menu_menu_raw[]"
};

console.log('❌ Current (Incorrect) Mapping:');
console.log(JSON.stringify(currentIncorrectMapping, null, 2));

console.log('\n🔧 Generating JOLT with current mapping...');
try {
  const incorrectJolt = JoltGeneratorEnhanced.generateResponseJolt(rawResponse, currentIncorrectMapping);
  console.log('\n❌ Incorrect JOLT Generated:');
  console.log(JSON.stringify(incorrectJolt, null, 2));
  
  // Test the transformation
  const result = JoltGeneratorEnhanced.performJoltTransformation(incorrectJolt, rawResponse);
  console.log('\n❌ Incorrect Result:');
  console.log(JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('❌ Error with incorrect mapping:', error.message);
}

// How the mapping SHOULD be built for proper JOLT generation (CORRECT)
console.log('\n' + '='.repeat(60));
console.log('✅ CORRECT APPROACH');
console.log('='.repeat(60));

// The correct way would be to not use dot notation in the source paths
// Instead, the JOLT generator should handle the nested structure internally
const correctMapping = {
  "profileDetails": {
    "authProfile": "nifiAutoProfile"
  },
  "userInformation": {
    "basicInformation": {
      "loginIdentifiers": {
        "*": {
          "type": "userinformation_basicinformation_loginidentifiers_menu[]",
          "value": "userinformation_basicinformation_loginidentifiers_menu_menu_raw[]"
        }
      }
    }
  }
};

console.log('✅ What the JOLT spec SHOULD look like:');
const correctJoltSpec = [
  {
    "operation": "shift",
    "spec": correctMapping
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "timestamp": new Date().toISOString(),
      "status": "SUCCEEDED",
      "nifiAutoProfile": "0",
      "userinformation_basicinformation_loginidentifiers_menu": ["unable to fetch"],
      "userinformation_basicinformation_loginidentifiers_menu_menu_raw": ["unable to fetch"]
    }
  }
];

console.log(JSON.stringify(correctJoltSpec, null, 2));

// Test the correct transformation
console.log('\n🧪 Testing correct JOLT...');
try {
  const correctResult = JoltGeneratorEnhanced.performJoltTransformation(correctJoltSpec, rawResponse);
  console.log('\n✅ Correct Result:');
  console.log(JSON.stringify(correctResult, null, 2));
  
  // Verify the correct values are extracted
  console.log('\n🎯 Verification:');
  console.log('- nifiAutoProfile:', correctResult.nifiAutoProfile);
  console.log('- loginIdentifiers menu:', correctResult.userinformation_basicinformation_loginidentifiers_menu);
  console.log('- menu_raw values:', correctResult.userinformation_basicinformation_loginidentifiers_menu_menu_raw);
  
} catch (error) {
  console.error('❌ Error with correct mapping:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🔧 SOLUTION NEEDED');
console.log('='.repeat(60));
console.log('The Template Creator needs to be fixed to:');
console.log('1. Convert dot-notation field mappings to nested objects');
console.log('2. Properly structure array field mappings with * wildcards');
console.log('3. Generate proper JOLT shift specifications');
console.log('');
console.log('Current issue: Template Creator passes flat dot-notation strings');
console.log('Required fix: Convert to nested object structure for JOLT');