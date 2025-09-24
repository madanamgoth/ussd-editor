// Test the user's specific curl command to debug the PASSWORD issue
const testUserCurlCommand = `curl --location --request GET \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userName=madan' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB'`;

console.log('🔍 DEBUG: Analyzing user\'s curl command');
console.log('='.repeat(60));

// 1. Parse the URL and extract query parameters
const urlMatch = testUserCurlCommand.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/);
if (urlMatch) {
  const url = urlMatch[1];
  console.log('✅ Extracted URL:', url);
  
  try {
    const urlObj = new URL(url);
    console.log('✅ Base URL:', urlObj.origin + urlObj.pathname);
    console.log('✅ Query string:', urlObj.search);
    
    const queryParams = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
      console.log(`✅ Query param: ${key} = ${value}`);
    });
    
    console.log('\n📋 Expected Query Parameters:');
    console.log(JSON.stringify(queryParams, null, 2));
    
    // 2. What the JOLT should look like
    const templateName = 'BILLPAYMENTS';
    console.log('\n📋 Expected JOLT Spec:');
    const expectedShiftSpec = {};
    Object.keys(queryParams).forEach(key => {
      expectedShiftSpec[key] = `${templateName}.${key}`;
    });
    
    const expectedJolt = [
      {
        "operation": "shift",
        "spec": expectedShiftSpec
      }
    ];
    
    console.log(JSON.stringify(expectedJolt, null, 2));
    
    // 3. Check for any body/POST data (there shouldn't be any for GET)
    const hasDataParams = testUserCurlCommand.includes('--data') || testUserCurlCommand.includes('-d');
    console.log('\n📋 Has POST body data:', hasDataParams ? 'YES' : 'NO');
    
    // 4. Where could PASSWORD come from?
    console.log('\n🤔 Potential sources of PASSWORD field:');
    console.log('1. Leftover from previous template/session ❌');
    console.log('2. Default field added by system ❌');  
    console.log('3. Query params not extracted properly ❌');
    console.log('4. User manually added it in Step 2 ❓');
    
    console.log('\n✅ CONCLUSION:');
    console.log('The curl command only has query parameters: grant_type and userName');
    console.log('PASSWORD field should NOT appear in the JOLT spec');
    console.log('Expected mapping should be:');
    console.log('  grant_type → BILLPAYMENTS.grant_type'); 
    console.log('  userName → BILLPAYMENTS.userName');
    
  } catch (error) {
    console.error('❌ Error parsing URL:', error);
  }
} else {
  console.error('❌ Could not extract URL from curl command');
}

console.log('\n' + '='.repeat(60));