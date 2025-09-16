#!/usr/bin/env node

/**
 * Test the fixed setNestedValue function with array notation
 */

// Copy of the fixed setNestedValue function
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    
    // Check if this part has array notation like "loginIdentifiers[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      
      // Create array if it doesn't exist
      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      
      // Ensure array has enough elements
      while (current[arrayName].length <= index) {
        current[arrayName].push({});
      }
      
      current = current[arrayName][index];
    } else {
      // Regular object property
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }
  
  // Handle the final part (could also have array notation)
  const finalPart = parts[parts.length - 1];
  const finalArrayMatch = finalPart.match(/^(.+)\[(\d+)\]$/);
  
  if (finalArrayMatch) {
    const [, arrayName, indexStr] = finalArrayMatch;
    const index = parseInt(indexStr, 10);
    
    // Create array if it doesn't exist
    if (!current[arrayName]) {
      current[arrayName] = [];
    }
    
    // Ensure array has enough elements
    while (current[arrayName].length <= index) {
      current[arrayName].push({});
    }
    
    current[arrayName][index] = value;
  } else {
    // Regular property assignment
    current[finalPart] = value;
  }
}

// Test the fix
console.log('🧪 Testing Array Notation Fix');
console.log('============================');

const testObj = {};

// Test case from your example
console.log('\n📋 Test 1: loginIdentifiers[0].value');
setNestedValue(testObj, 'userInformation.basicInformation.loginIdentifiers[0].value', 'amgothmadanID');

console.log('\n📋 Test 2: notificationIdentifiers[0].type');
setNestedValue(testObj, 'userInformation.basicInformation.notificationIdentifiers[0].type', 'EMAILID');

console.log('\n📋 Test 3: notificationIdentifiers[0].value');
setNestedValue(testObj, 'userInformation.basicInformation.notificationIdentifiers[0].value', 'madan1@comviva.com');

console.log('\n📋 Test 4: Regular properties');
setNestedValue(testObj, 'userInformation.basicInformation.emailId', 'madan1@comviva.com');
setNestedValue(testObj, 'userInformation.basicInformation.firstName', 'Alaina');
setNestedValue(testObj, 'requestType', 'ADMIN-REGISTER');

console.log('\n🔍 Final Result:');
console.log(JSON.stringify(testObj, null, 2));

console.log('\n✅ Array Structure Check:');
console.log('loginIdentifiers is array:', Array.isArray(testObj.userInformation?.basicInformation?.loginIdentifiers));
console.log('notificationIdentifiers is array:', Array.isArray(testObj.userInformation?.basicInformation?.notificationIdentifiers));

console.log('\n🎯 Expected Structure:');
console.log('- loginIdentifiers should be an array with object at index 0');
console.log('- notificationIdentifiers should be an array with object at index 0');
console.log('- No [0] keys as literal strings');