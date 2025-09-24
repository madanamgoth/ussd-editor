// Test to simulate the exact flow and identify where PASSWORD field comes from
console.log('🔍 DEBUGGING PASSWORD FIELD ISSUE');
console.log('='.repeat(60));

// Simulate the exact curl parsing flow
const curlInput = `curl --location --request GET \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userName=madan' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB'`;

// Parse URL to extract query parameters
const urlMatch = curlInput.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/);
const url = urlMatch[1];
console.log('✅ Extracted URL:', url);

// Extract query parameters
const urlObj = new URL(url);
const queryParams = {};
urlObj.searchParams.forEach((value, key) => {
  queryParams[key] = value;
  console.log(`✅ Query param: ${key} = ${value}`);
});

// Extract headers  
const headers = {};
const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g;
let headerMatch;
while ((headerMatch = headerRegex.exec(curlInput)) !== null) {
  headers[headerMatch[1].trim()] = headerMatch[2].trim();
}

// Simulate field extraction - EXACTLY as the system does it
const allFields = [];

// 1. Add header fields
Object.keys(headers).forEach(headerName => {
  allFields.push({
    path: `headers.${headerName}`,
    value: headers[headerName],
    type: 'string',
    category: 'header',
    mappingType: 'static',
    storeAttribute: '',
    targetPath: `headers.${headerName}`
  });
});

// 2. Add query parameter fields
Object.keys(queryParams).forEach(paramName => {
  const queryField = {
    path: `query.${paramName}`,
    value: queryParams[paramName],
    type: 'string',
    category: 'query',
    mappingType: 'dynamic',
    storeAttribute: paramName,
    targetPath: `query.${paramName}`
  };
  allFields.push(queryField);
  console.log(`✅ Added query field: ${paramName} (category: query, mappingType: dynamic)`);
});

// 3. Check for any body fields (should be none for GET)
console.log('\n📋 All extracted fields:');
allFields.forEach((field, index) => {
  if (field.category !== 'header') {
    console.log(`${index}: ${field.path} | category: ${field.category} | mappingType: ${field.mappingType} | storeAttribute: ${field.storeAttribute}`);
  }
});

// 4. Simulate JOLT generation with the EXACT logic from the system
console.log('\n🔧 Simulating JOLT generation...');
const templateName = 'GETBILLER1';
const requestShiftSpec = {};
const requestDefaultSpec = {};

// Helper function
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
};

// Process fields with the EXACT logic
allFields.forEach((field, index) => {
  console.log(`\n🔍 Processing field ${index}:`, {
    storeAttribute: field.storeAttribute,
    category: field.category,
    mappingType: field.mappingType,
    path: field.path
  });
  
  if (field.mappingType === 'dynamic' && field.storeAttribute) {
    if (field.category === 'query') {
      // For query parameters, use template name wrapping: templateName.fieldName
      const wrappedTarget = `${templateName}.${field.storeAttribute}`;
      setNestedValue(requestShiftSpec, field.storeAttribute, wrappedTarget);
      console.log(`✅ Query param (dynamic): ${field.storeAttribute} → ${wrappedTarget}`);
    } else if (field.category === 'body' && field.path && !field.path.includes('.')) {
      // For top-level body fields (like --data-urlencode params), use template name wrapping
      const wrappedTarget = `${templateName}.${field.storeAttribute}`;
      setNestedValue(requestShiftSpec, field.storeAttribute, wrappedTarget);
      console.log(`✅ Body field (dynamic with template wrapping): ${field.storeAttribute} → ${wrappedTarget}`);
    } else {
      // Regular dynamic fields (nested body, session variables, etc.) - use input wrapper
      console.log(`⚠️ FALLBACK: Field "${field.storeAttribute}" using input wrapper because category="${field.category}", path="${field.path}"`);
      if (field.storeAttribute === 'PASSWORD') {
        console.log(`🚨 FOUND PASSWORD FIELD! This is where the bug is!`);
      }
      if (!requestShiftSpec.input) requestShiftSpec.input = {};
      setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
      console.log(`✅ Dynamic field: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
    }
  }
  // Skip static fields for this test
});

// Check if PASSWORD field was generated
const hasPasswordInInput = requestShiftSpec.input && requestShiftSpec.input.PASSWORD;
const hasPasswordDirect = requestShiftSpec.PASSWORD;

console.log('\n🎯 RESULTS:');
console.log('Generated requestShiftSpec:');
console.log(JSON.stringify(requestShiftSpec, null, 2));

console.log('\n🔍 PASSWORD field analysis:');
console.log('PASSWORD in input wrapper:', hasPasswordInInput ? 'YES (BUG!)' : 'NO');
console.log('PASSWORD as direct mapping:', hasPasswordDirect ? 'YES' : 'NO');

// Find which field (if any) caused PASSWORD to be generated
const passwordField = allFields.find(f => f.storeAttribute === 'PASSWORD');
if (passwordField) {
  console.log('🚨 PASSWORD field found in allFields:', passwordField);
} else {
  console.log('✅ No PASSWORD field found in extracted fields (correct)');
}

console.log('\n✅ Expected result should be:');
console.log(JSON.stringify({
  "grant_type": "GETBILLER1.grant_type",
  "userName": "GETBILLER1.userName"
}, null, 2));

console.log('\n' + '='.repeat(60));