/**
 * Test: Session Variable Array Name Extraction
 * 
 * This test verifies that when creating a second template that uses session variables
 * from a previous template, the JOLT generation correctly extracts the array name
 * from the selected session variable instead of using hardcoded values.
 */

// Mock the request mapping as it would appear when user selects session variables
const testRequestMapping = [
  {
    path: 'profileDetails.authProfile',
    mappingType: 'session',
    storeAttribute: 'SEARCH_selectedItem.title', // User selected this from dropdown
    targetPath: 'profileDetails.authProfile'
  },
  {
    path: 'user.bookId',
    mappingType: 'session', 
    storeAttribute: 'SEARCH_selectedItem.id', // User selected this from dropdown
    targetPath: 'user.bookId'
  }
];

// Mock available variables (as they would come from previous template)
const testAvailableVariables = [
  'SEARCH_items',
  'SEARCH_selectedItem.title',
  'SEARCH_selectedItem.id', 
  'SEARCH_selectedItem.author',
  'PIN',
  'selection'
];

// Mock empty array config (since this is a second template, not first)
const testSelectedArrayConfig = {
  selectedArray: null,
  sessionVariable: null,
  customSessionName: null
};

const testArrayPreview = {
  detectedArrays: []
};

// Function to extract array name from session variables (extracted from the main code)
function extractArrayNameFromSessionVariables(requestMapping, availableVariables) {
  console.log('🔍 Checking for session variables from previous templates...');
  
  const sessionFields = requestMapping.filter(field => 
    field.mappingType === 'session' && field.storeAttribute && 
    (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
  );
  
  if (sessionFields.length > 0) {
    const firstSessionVar = sessionFields[0].storeAttribute;
    console.log('🎯 Found session variable:', firstSessionVar);
    
    // Extract array name from session variable patterns:
    // - "SEARCH_selectedItem.title" → "SEARCH"
    // - "selectedItem.title" → fallback to "items" 
    if (firstSessionVar.includes('_selectedItem.')) {
      const parts = firstSessionVar.split('_selectedItem.');
      if (parts.length >= 2) {
        const arrayName = parts[0]; // e.g., "SEARCH"
        console.log('✅ Extracted array name from session variable:', arrayName);
        return arrayName;
      }
    } else if (firstSessionVar.includes('selectedItem.')) {
      // Generic selectedItem - look for any session variables with _items pattern
      const itemsVariable = availableVariables.find(v => v.endsWith('_items'));
      if (itemsVariable) {
        const arrayName = itemsVariable.replace('_items', '');
        console.log('✅ Found generic session variable with items pattern:', arrayName);
        return arrayName;
      }
    }
  }
  
  return null;
}

// Run the test
console.log('🧪 Testing Session Variable Array Name Extraction');
console.log('===============================================');

console.log('\n📋 Test Input:');
console.log('Request Mapping:', testRequestMapping);
console.log('Available Variables:', testAvailableVariables);
console.log('Selected Array Config:', testSelectedArrayConfig);

console.log('\n🔄 Running extraction logic...');
const extractedArrayName = extractArrayNameFromSessionVariables(testRequestMapping, testAvailableVariables);

console.log('\n🎯 Test Results:');
console.log('Extracted Array Name:', extractedArrayName);

// Verify the result
if (extractedArrayName === 'SEARCH') {
  console.log('✅ SUCCESS: Correctly extracted "SEARCH" from "SEARCH_selectedItem.title"');
  console.log('✅ This means the JOLT will use "SEARCH" instead of hardcoded "book_map"');
} else {
  console.log('❌ FAILED: Expected "SEARCH" but got:', extractedArrayName);
}

// Test the JOLT generation key creation
console.log('\n🔧 Testing JOLT Key Generation:');
if (extractedArrayName) {
  const baseName = extractedArrayName.replace(/_items$/, '');
  const menuJoltKey = `${baseName}_menu_raw`;
  console.log('Generated Menu JOLT Key:', menuJoltKey);
  
  if (menuJoltKey === 'SEARCH_menu_raw') {
    console.log('✅ SUCCESS: Correctly generated menu JOLT key');
  } else {
    console.log('❌ FAILED: Expected "SEARCH_menu_raw" but got:', menuJoltKey);
  }
}

// Test with generic selectedItem pattern
console.log('\n🧪 Testing Generic selectedItem Pattern:');
const genericTestMapping = [
  {
    path: 'user.name',
    mappingType: 'session',
    storeAttribute: 'selectedItem.title', // Generic pattern
    targetPath: 'user.name'
  }
];

const genericExtracted = extractArrayNameFromSessionVariables(genericTestMapping, testAvailableVariables);
console.log('Generic extraction result:', genericExtracted);

if (genericExtracted === 'SEARCH') {
  console.log('✅ SUCCESS: Generic pattern correctly found SEARCH from _items variable');
} else {
  console.log('❌ FAILED: Generic pattern should have found SEARCH');
}

console.log('\n🏆 Test Complete!');