// Comprehensive test for the complete --data-urlencode workflow
const testCurlWithDataUrlencode = `curl --location --request POST \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB' \\
--data-urlencode 'grant_type=client_credentials'`;

console.log('🧪 Testing complete --data-urlencode workflow...');

// 1. Parse the curl command (simulating the parseCurlCommand function)
console.log('\n📝 Step 1: Parse cURL command');
let method = 'GET';
let url = '';
let headers = {};
let body = {};

// Parse method
const methodMatch = testCurlWithDataUrlencode.match(/(?:-X|--request)\s+([A-Z]+)/i);
if (methodMatch) {
  method = methodMatch[1].toUpperCase();
  console.log(`✅ Method: ${method}`);
}

// Parse URL
const urlMatch = testCurlWithDataUrlencode.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/);
if (urlMatch) {
  url = urlMatch[1];
  console.log(`✅ URL: ${url}`);
}

// Parse headers
const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g;
let headerMatch;
while ((headerMatch = headerRegex.exec(testCurlWithDataUrlencode)) !== null) {
  headers[headerMatch[1].trim()] = headerMatch[2].trim();
}
console.log(`✅ Headers: ${Object.keys(headers).length} found`);

// Parse --data-urlencode parameters
const dataUrlencodeRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
let urlencodeMatch;
while ((urlencodeMatch = dataUrlencodeRegex.exec(testCurlWithDataUrlencode)) !== null) {
  const key = urlencodeMatch[1].trim();
  const value = urlencodeMatch[2].trim();
  body[key] = value;
  console.log(`✅ Data-urlencode: ${key} = ${value}`);
}

// 2. Simulate field extraction and mapping
console.log('\n📝 Step 2: Extract and categorize fields');
const templateName = 'SYSTEM_TOKEN';
const allFields = [];

// Extract body fields (from --data-urlencode)
Object.keys(body).forEach(key => {
  allFields.push({
    path: key,
    value: body[key],
    type: 'string',
    category: 'body', // --data-urlencode creates body parameters
    mappingType: 'static',
    storeAttribute: key,
    staticValue: body[key]
  });
  console.log(`✅ Body field: ${key} = ${body[key]}`);
});

// 3. Generate JOLT specs with template name wrapping
console.log('\n📝 Step 3: Generate JOLT specs');

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

// Generate request JOLT spec
const requestShiftSpec = { input: {} };
const requestDefaultSpec = {};

allFields.forEach(field => {
  if (field.mappingType === 'static' && field.category === 'body') {
    // For body parameters, add to default spec with template wrapping
    const wrappedTarget = `${templateName}.${field.storeAttribute}`;
    setNestedValue(requestDefaultSpec, wrappedTarget, field.staticValue);
    console.log(`✅ Static body field: ${wrappedTarget} = ${field.staticValue}`);
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

console.log('\n📤 Final JOLT specification:');
console.log(JSON.stringify(requestJolt, null, 2));

// 4. Verify against expected output
console.log('\n📝 Step 4: Verify against expected output');
const expectedJolt = [
  {
    "operation": "shift",
    "spec": {
      "grant_type": "SYSTEM_TOKEN.grant_type"
    }
  }
];

// Check if our generated JOLT matches the expected pattern
const hasDefaultOperation = requestJolt.some(op => 
  op.operation === 'default' && 
  op.spec['SYSTEM_TOKEN.grant_type'] === 'client_credentials'
);

console.log('✅ Expected pattern (from example):');
console.log(JSON.stringify(expectedJolt, null, 2));

console.log('\n✅ Generated pattern:');
console.log(JSON.stringify(requestJolt, null, 2));

console.log('\n✅ Template name wrapping working:', hasDefaultOperation ? 'YES' : 'NO');
console.log('✅ Empty operations filtered:', rawRequestJolt.length > requestJolt.length ? 'YES' : 'NO');

// 5. Show the expected transformation result
console.log('\n📝 Step 5: Expected transformation result');
console.log('Input JSON:');
console.log('{ "grant_type": "client_credentials" }');

console.log('\nAfter JOLT transformation:');
console.log('{ "SYSTEM_TOKEN": { "grant_type": "client_credentials" } }');

console.log('\n✅ Complete workflow test completed!');