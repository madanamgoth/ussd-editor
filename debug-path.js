// Test the EXACT URL from user's example to find where parsing breaks// Debug the path generation issue

console.log('🔍 DEBUGGING EXACT USER URL');const testFlow = [

console.log('='.repeat(70));

    "id": "start_1756723559966_699",

const exactURL = 'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan';    "type": "START",

    "transitions": {

console.log('📋 Testing URL:', exactURL);      "123": "input_1756186045582_804"

    },

// Test URL parsing    "nextNodeType": "INPUT",

try {    "nextNodePrompts": {

  const urlObj = new URL(exactURL);      "en": "Please enter your PIN:"

  console.log('\n✅ URL parsed successfully');    }

  console.log('Base URL:', urlObj.origin + urlObj.pathname);  },

  console.log('Search params:', urlObj.search);  {

      "id": "input_1756186045582_804",

  // Extract query parameters    "type": "INPUT",

  const queryParams = {};    "transitions": {

  console.log('\n📝 Extracting query parameters:');      "*": "action_1756186083800_637"

      },

  urlObj.searchParams.forEach((value, key) => {    "nextNodeType": "ACTION",

    queryParams[key] = value;    "nextNodePrompts": {

    console.log(`✅ Found: ${key} = ${value}`);      "en": ""

  });    },

      "storeAttribute": "PIN"

  console.log('\n📋 Final queryParams object:');  },

  console.log(JSON.stringify(queryParams, null, 2));  {

      "id": "action_1756186083800_637",

  // Test if userId is correctly extracted    "type": "ACTION",

  if (queryParams.userId) {    "transitions": {

    console.log('✅ userId correctly extracted:', queryParams.userId);      "200": "menu_1756187079757_934"

  } else {    },

    console.log('❌ userId NOT found in query parameters!');    "nextNodesMetadata": {

  }      "200": {

          "nextNodeType": "MENU",

  if (queryParams.grant_type) {        "nextNodePrompts": {

    console.log('✅ grant_type correctly extracted:', queryParams.grant_type);          "en": "1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu"

  } else {        }

    console.log('❌ grant_type NOT found in query parameters!');      }

  }    },

      "templateId": "PINVALIDATION"

  // Test the exact curl command parsing  },

  console.log('\n' + '='.repeat(70));  {

  console.log('🔍 TESTING FULL CURL COMMAND PARSING');    "id": "menu_1756187079757_934",

      "type": "MENU",

  const curlCommand = `curl --location --request GET \\    "transitions": {

'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan' \\      "1": "end_1756190011569_521"

--header 'Content-Type: application/x-www-form-urlencoded' \\    },

--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\    "nextNodesMetadata": {

--header 'SkipSecurityHeaderValidation: true' \\      "1": {

--header 'SkipPayloadEncryption: true' \\        "nextNodeType": "END",

--header 'X-Channel: WEB'`;        "nextNodePrompts": {

          "en": "Thank you for using our service! End of Send Money"

  console.log('\nCurl command to parse:');        }

  console.log(curlCommand);      }

      }

  // Extract URL from curl (simulate the exact regex from the system)  },

  const urlMatches = [  {

    curlCommand.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/),    "id": "end_1756190011569_521",

    curlCommand.match(/(?:--location|curl)\s+(?:--request\s+\w+\s+)?\\?\s*['"]([^'"]+)['"]/),    "type": "END",

    curlCommand.match(/--request\s+GET\s+\\?\s*['"]([^'"]+)['"]/),    "transitions": {}

    curlCommand.match(/['"]([^'"]*https?:\/\/[^'"]*)['"]/),  }

    curlCommand.match(/(https?:\/\/[^\s'"\\]+(?:\?[^\s'"\\\n]*)?)/),];

  ];

console.log('=== DEBUG: Path Generation Issue ===');

  let extractedURL = null;console.log('');

  for (let i = 0; i < urlMatches.length; i++) {

    const match = urlMatches[i];const startNode = testFlow.find(n => n.type === 'START');

    if (match && match[1]) {console.log('START Node:', startNode.id);

      extractedURL = match[1];console.log('START Transitions:', startNode.transitions);

      console.log(`✅ URL extracted with pattern ${i + 1}: ${extractedURL}`);

      break;console.log('');

    } else {console.log('Expected Path Should Be:');

      console.log(`❌ Pattern ${i + 1} failed:`, match ? 'matched but no group' : 'no match');console.log('1. User Input: "123" → Expected: "Please enter your PIN:" (START → INPUT)');

    }console.log('2. User Input: "1234" → Expected: "" (INPUT → ACTION)');  

  }console.log('3. User Input: N/A → Expected: "" (ACTION processes)');

  console.log('4. User Input: "1" → Expected: "1. Check Balance..." (ACTION → MENU)');

  if (extractedURL) {console.log('5. User Input: Final → Expected: "Thank you..." (MENU → END)');

    // Parse the extracted URL

    const extractedUrlObj = new URL(extractedURL);console.log('');

    const extractedQueryParams = {};console.log('Current K6 Script is doing:');

    console.log('1. User Input: "123" → Expected: "Please enter your PIN:" ✅ CORRECT');

    console.log('\n📝 Query params from extracted URL:');console.log('2. User Input: "DIAL" → Expected: "Please enter your PIN:" ❌ WRONG!');

    extractedUrlObj.searchParams.forEach((value, key) => {console.log('   - This DIAL step should not exist!');

      extractedQueryParams[key] = value;console.log('   - It skips the PIN input step entirely');

      console.log(`✅ ${key} = ${value}`);

    });console.log('');

    console.log('Root Cause: K6 script adds a fake "DIAL" step that disrupts the flow');

    // Simulate field creationconsole.log('Solution: Remove the initialStep DIAL creation and let traverse handle START node properly');

    console.log('\n📝 Simulating field creation:');
    const allFields = [];
    
    Object.keys(extractedQueryParams).forEach(paramName => {
      const queryField = {
        path: `query.${paramName}`,
        value: extractedQueryParams[paramName],
        type: 'string',
        category: 'query',
        mappingType: 'dynamic',
        storeAttribute: paramName, // This should be 'userId', not 'PASSWORD'
        targetPath: `query.${paramName}`
      };
      allFields.push(queryField);
      console.log(`✅ Created field: storeAttribute="${paramName}", category="query"`);
    });
    
    // Expected JOLT
    console.log('\n📋 Expected JOLT spec:');
    const expectedJolt = {
      "operation": "shift",
      "spec": {}
    };
    
    allFields.forEach(field => {
      if (field.category === 'query') {
        expectedJolt.spec[field.storeAttribute] = `Template.${field.storeAttribute}`;
      }
    });
    
    console.log(JSON.stringify(expectedJolt, null, 2));
    
    // Check for PASSWORD field
    const hasPasswordField = allFields.some(f => f.storeAttribute === 'PASSWORD');
    console.log('\n🔍 PASSWORD field check:');
    console.log('PASSWORD field found in extracted fields:', hasPasswordField ? 'YES (BUG!)' : 'NO (CORRECT)');
    
    if (hasPasswordField) {
      const passwordField = allFields.find(f => f.storeAttribute === 'PASSWORD');
      console.log('🚨 PASSWORD field details:', passwordField);
    }
    
    // Check specific fields
    const userIdField = allFields.find(f => f.storeAttribute === 'userId');
    if (userIdField) {
      console.log('✅ userId field found:', userIdField);
    } else {
      console.log('❌ userId field NOT found!');
    }
    
  } else {
    console.log('❌ Could not extract URL from curl command');
  }
  
} catch (error) {
  console.error('❌ URL parsing error:', error);
}

console.log('\n' + '='.repeat(70));