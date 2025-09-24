// Test script to verify --data-urlencode parsing
const testCurlWithDataUrlencode = `curl --location --request POST \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB' \\
--data-urlencode 'grant_type=client_credentials'`;

console.log('🧪 Testing --data-urlencode parsing...');
console.log('\n📥 Input curl command:');
console.log(testCurlWithDataUrlencode);

// Test the regex pattern for --data-urlencode
const dataUrlencodeRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
let urlencodeMatch;
let urlencodeCount = 0;
const body = {};

while ((urlencodeMatch = dataUrlencodeRegex.exec(testCurlWithDataUrlencode)) !== null) {
  const key = urlencodeMatch[1].trim();
  const value = urlencodeMatch[2].trim();
  body[key] = value;
  urlencodeCount++;
  console.log(`🔗 Found --data-urlencode param ${urlencodeCount}: ${key} = ${value}`);
}

console.log('\n📤 Parsed body object:');
console.log(JSON.stringify(body, null, 2));

console.log('\n✅ Expected result:');
console.log('{ "grant_type": "client_credentials" }');

console.log('\n✅ Test result:', JSON.stringify(body) === '{"grant_type":"client_credentials"}' ? 'PASSED' : 'FAILED');

// Test the template name mapping as described in the example
const templateName = 'SYSTEM_TOKEN'; // This would come from user input
const expectedJoltSpec = [
  {
    "operation": "shift",
    "spec": {
      "grant_type": `${templateName}.grant_type`
    }
  }
];

console.log('\n🔍 Expected JOLT spec for template name mapping:');
console.log(JSON.stringify(expectedJoltSpec, null, 2));

console.log('\n✅ Test completed!');