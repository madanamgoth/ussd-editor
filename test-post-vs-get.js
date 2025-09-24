// Compare POST --data-urlencode vs GET query parameters processing
console.log('🔍 COMPARING POST vs GET DATA PROCESSING');
console.log('='.repeat(70));

// Test 1: POST with --data-urlencode (should work correctly)
console.log('\n📝 TEST 1: POST with --data-urlencode');
const postCurl = `curl --location --request POST \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--data-urlencode 'grant_type=client_credentials'`;

console.log('POST curl command:');
console.log(postCurl);

// Simulate POST parsing
let postBody = {};
const dataUrlencodeRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
let urlencodeMatch;
while ((urlencodeMatch = dataUrlencodeRegex.exec(postCurl)) !== null) {
  const key = urlencodeMatch[1].trim();
  const value = urlencodeMatch[2].trim();
  postBody[key] = value;
  console.log(`✅ POST --data-urlencode: ${key} = ${value}`);
}

// Simulate field creation for POST
const postFields = [];
Object.keys(postBody).forEach(key => {
  postFields.push({
    path: key,
    value: postBody[key],
    type: 'string',
    category: 'body', // POST data goes to body
    mappingType: 'dynamic',
    storeAttribute: key,
    targetPath: key
  });
  console.log(`✅ POST field created: ${key} (category: body, mappingType: dynamic)`);
});

console.log('\n📋 Expected POST JOLT:');
const expectedPostJolt = {
  "operation": "shift",
  "spec": {
    "grant_type": "TEMPLATE.grant_type"
  }
};
console.log(JSON.stringify(expectedPostJolt, null, 2));

// Test 2: GET with query parameters (current issue)
console.log('\n' + '='.repeat(70));
console.log('📝 TEST 2: GET with query parameters');
const getCurl = `curl --location --request GET \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ'`;

console.log('GET curl command:');
console.log(getCurl);

// Simulate GET parsing
const urlMatch = getCurl.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/);
const url = urlMatch[1];
console.log('✅ GET URL extracted:', url);

const urlObj = new URL(url);
const queryParams = {};
urlObj.searchParams.forEach((value, key) => {
  queryParams[key] = value;
  console.log(`✅ GET query param: ${key} = ${value}`);
});

// Simulate field creation for GET
const getFields = [];
Object.keys(queryParams).forEach(key => {
  getFields.push({
    path: `query.${key}`,
    value: queryParams[key],
    type: 'string',
    category: 'query', // GET params go to query
    mappingType: 'dynamic',
    storeAttribute: key,
    targetPath: `query.${key}`
  });
  console.log(`✅ GET field created: ${key} (category: query, mappingType: dynamic)`);
});

console.log('\n📋 Expected GET JOLT:');
const expectedGetJolt = {
  "operation": "shift",
  "spec": {
    "grant_type": "TEMPLATE.grant_type",
    "userId": "TEMPLATE.userId"
  }
};
console.log(JSON.stringify(expectedGetJolt, null, 2));

// Analysis
console.log('\n' + '='.repeat(70));
console.log('🔍 ANALYSIS:');

console.log('\n📊 POST vs GET Processing:');
console.log('POST --data-urlencode:');
console.log('  - Creates body fields (category: "body")');
console.log('  - mappingType: "dynamic"');
console.log('  - Should generate shift operation');

console.log('\nGET query parameters:');
console.log('  - Creates query fields (category: "query")');
console.log('  - mappingType: "dynamic"');
console.log('  - Should ALSO generate shift operation');

console.log('\n🤔 POTENTIAL ISSUES:');
console.log('1. Are GET query params being changed to mappingType: "static" somewhere?');
console.log('2. Is there different logic for category: "query" vs category: "body"?');
console.log('3. Are query params getting different treatment in the UI (Step 2)?');

console.log('\n✅ BOTH should generate shift operations with template wrapping!');
console.log('POST: grant_type → TEMPLATE.grant_type');
console.log('GET:  grant_type → TEMPLATE.grant_type, userId → TEMPLATE.userId');

console.log('\n' + '='.repeat(70));