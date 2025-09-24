console.log("🔍 PASSWORD Mystery Investigation");
console.log("================================");

// Test both POST and GET to see what's different
const postCurl = `curl -X POST "https://api.example.com/oauth/token" \\
-H "Content-Type: application/x-www-form-urlencoded" \\
--data-urlencode "grant_type=client_credentials" \\
--data-urlencode "userId=madan" \\
--data-urlencode "password=secret123"`;

const getCurl = `curl -X GET "https://api.example.com/oauth/token?grant_type=client_credentials&userId=madan" \\
-H "Authorization: Bearer token123"`;

console.log("\n📋 POST CURL:");
console.log(postCurl);
console.log("\n📋 GET CURL:");
console.log(getCurl);

// Simulate the exact parsing logic from TemplateCreator
function parseCurlCommand(curlCommand) {
  const extractedFields = [];
  
  // Extract --data-urlencode parameters (for POST)
  const dataUrlencodeMatches = curlCommand.match(/--data-urlencode\s+['"](.*?)['"](?:\s|\\|$)/g);
  if (dataUrlencodeMatches) {
    console.log("\n🔍 Found --data-urlencode matches:", dataUrlencodeMatches);
    dataUrlencodeMatches.forEach(match => {
      const paramMatch = match.match(/--data-urlencode\s+['"](.*?)=(.*?)['"](?:\s|\\|$)/);
      if (paramMatch) {
        const [, paramName, paramValue] = paramMatch;
        console.log(`  📝 POST data-urlencode: ${paramName} = ${paramValue}`);
        extractedFields.push({
          storeAttribute: paramName,
          value: paramValue,
          category: 'body',
          mappingType: 'dynamic',
          path: paramName
        });
      }
    });
  }
  
  // Extract URL and query parameters (for GET)
  const urlMatch = curlCommand.match(/['"](https?:\/\/[^'"]+)['"]/);
  if (urlMatch) {
    const url = urlMatch[1];
    console.log("\n🔗 Found URL:", url);
    
    const urlObj = new URL(url);
    console.log("🔍 Query params:", urlObj.searchParams);
    
    for (const [paramName, paramValue] of urlObj.searchParams) {
      console.log(`  📝 GET query param: ${paramName} = ${paramValue}`);
      extractedFields.push({
        storeAttribute: paramName,
        value: paramValue,
        category: 'query',
        mappingType: 'dynamic',
        path: paramName
      });
    }
  }
  
  return extractedFields;
}

console.log("\n🧪 TESTING POST CURL PARSING:");
console.log("==============================");
const postFields = parseCurlCommand(postCurl);
console.log("POST Fields:", postFields);

console.log("\n🧪 TESTING GET CURL PARSING:");
console.log("=============================");
const getFields = parseCurlCommand(getCurl);
console.log("GET Fields:", getFields);

// Simulate JOLT generation for each
function generateJolt(fields, templateName = "Template") {
  const specs = [];
  
  fields.forEach(field => {
    if (field.mappingType === 'dynamic') {
      specs.push({
        operation: "shift",
        spec: {
          [field.storeAttribute]: `${templateName}.${field.storeAttribute}`
        }
      });
    }
  });
  
  return specs;
}

console.log("\n📋 POST JOLT OUTPUT:");
console.log("====================");
const postJolt = generateJolt(postFields);
console.log(JSON.stringify(postJolt, null, 2));

console.log("\n📋 GET JOLT OUTPUT:");
console.log("===================");
const getJolt = generateJolt(getFields);
console.log(JSON.stringify(getJolt, null, 2));

console.log("\n🎯 EXPECTED vs ACTUAL:");
console.log("======================");
console.log("✅ EXPECTED GET JOLT:");
console.log(`{
  "operation": "shift",
  "spec": {
    "grant_type": "Template.grant_type",
    "userId": "Template.userId"
  }
}`);

console.log("\n❌ BUT USER SEES:");
console.log(`{
  "operation": "shift",
  "spec": {
    "PASSWORD": "Template.PASSWORD"
  }
}`);

console.log("\n🔍 MYSTERY: Where does PASSWORD come from?");
console.log("The parsing logic extracts grant_type and userId correctly.");
console.log("Something else in the UI must be overriding or filtering these fields.");