// Test the EXACT URL from user's example to find where parsing breaks
console.log('DEBUGGING EXACT USER URL');
console.log('======================================================================');

const exactURL = 'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan';

console.log('Testing URL:', exactURL);

// Test URL parsing
try {
  const urlObj = new URL(exactURL);
  console.log('\nURL parsed successfully');
  console.log('Base URL:', urlObj.origin + urlObj.pathname);
  console.log('Search params:', urlObj.search);
  
  // Extract query parameters
  const queryParams = {};
  console.log('\nExtracting query parameters:');
  
  urlObj.searchParams.forEach((value, key) => {
    queryParams[key] = value;
    console.log(`Found: ${key} = ${value}`);
  });
  
  console.log('\nFinal queryParams object:');
  console.log(JSON.stringify(queryParams, null, 2));
  
  // Test if userId is correctly extracted
  if (queryParams.userId) {
    console.log('userId correctly extracted:', queryParams.userId);
  } else {
    console.log('ERROR: userId NOT found in query parameters!');
  }
  
  if (queryParams.grant_type) {
    console.log('grant_type correctly extracted:', queryParams.grant_type);
  } else {
    console.log('ERROR: grant_type NOT found in query parameters!');
  }
  
  // Expected JOLT spec should be:
  console.log('\nExpected JOLT spec should be:');
  const expectedJolt = {
    "operation": "shift",
    "spec": {
      "grant_type": "Template.grant_type",
      "userId": "Template.userId"
    }
  };
  console.log(JSON.stringify(expectedJolt, null, 2));
  
  console.log('\nBUT the actual result shows:');
  const actualBuggyJolt = {
    "operation": "shift", 
    "spec": {
      "PASSWORD": "Template.PASSWORD"
    }
  };
  console.log(JSON.stringify(actualBuggyJolt, null, 2));
  
  console.log('\nCONCLUSION: The query parameter extraction works correctly.');
  console.log('The PASSWORD field is being added somewhere else in the UI flow.');
  console.log('userId is definitely in the URL and should be extracted as userId, not PASSWORD.');
  
} catch (error) {
  console.error('URL parsing error:', error);
}

console.log('\n======================================================================');