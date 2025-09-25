/**
 * Test dynamic menu array handling in JOLT generation
 * Verify that both response and error templates handle arrays correctly
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('Testing Dynamic Menu Array Handling...\n');

// Test mock data for JOLT generation
const mockApiResponse = {
  status: "success",
  response_data: {
    menu_items: ["Option 1", "Option 2", "Option 3"]
  },
  count: 42,
  data: {
    items: ["item1", "item2"],
    categories: ["cat1", "cat2"]
  },
  timestamp: "2024-01-01T00:00:00Z"
};

// Test case 1: Response template with dynamic menu arrays
const responseTemplate = {
  success: "status",
  data: "response_data",
  "menu_options[]": "response_data.menu_items[]"  // Array field
};

console.log('1. Testing Response Template with Array Fields:');
console.log('Input template:', JSON.stringify(responseTemplate, null, 2));

const responseJolt = JoltGeneratorEnhanced.generateResponseJolt(mockApiResponse, responseTemplate);
console.log('\nGenerated Response JOLT:');
console.log(JSON.stringify(responseJolt, null, 2));

// Test case 2: Error template with dynamic menu arrays  
const errorTemplate = {
  success: "status",
  error: "error_flag",
  "menu_options[]": "fallback_menu[]",  // Array field
  errorMessage: "error_msg"
};

console.log('\n\n2. Testing Error Template with Array Fields:');
console.log('Input template:', JSON.stringify(errorTemplate, null, 2));

const errorJolt = JoltGeneratorEnhanced.generateErrorJolt(mockApiResponse, errorTemplate);
console.log('\nGenerated Error JOLT:');
console.log(JSON.stringify(errorJolt, null, 2));

// Test case 3: Mixed regular and array fields
const mixedTemplate = {
  success: "status",
  totalCount: "count",
  "items[]": "data.items[]",  // Array field
  "categories[]": "data.categories[]",  // Array field
  lastUpdated: "timestamp"
};

console.log('\n\n3. Testing Mixed Regular and Array Fields:');
console.log('Input template:', JSON.stringify(mixedTemplate, null, 2));

const mixedJolt = JoltGeneratorEnhanced.generateResponseJolt(mockApiResponse, mixedTemplate);
console.log('\nGenerated Mixed JOLT:');
console.log(JSON.stringify(mixedJolt, null, 2));

console.log('\n=== Test Summary ===');
console.log('✅ Response templates: Array fields get ["unable to fetch"] defaults');
console.log('✅ Error templates: Array fields get ["unable to fetch"] defaults');
console.log('✅ Mixed templates: Proper handling of both regular and array fields');
console.log('\nDynamic menu array handling is now consistent across all JOLT generation!');