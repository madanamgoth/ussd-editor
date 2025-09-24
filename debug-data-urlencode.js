console.log("🔍 Testing --data-urlencode Regex Pattern");
console.log("=========================================");

// Test the current regex against the user's exact curl command
function testDataUrlencodeRegex() {
  
  const curlCommand = `curl --location --request POST 'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB' \\
--data-urlencode 'grant_type=client_credentials' \\
--data-urlencode 'userName=madan'`;
  
  console.log("🧪 Testing current regex pattern:");
  
  // Current regex from TemplateCreator.jsx
  const currentRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
  console.log("Current regex:", currentRegex);
  
  let matches = [];
  let match;
  while ((match = currentRegex.exec(curlCommand)) !== null) {
    matches.push({
      full: match[0],
      key: match[1],
      value: match[2]
    });
  }
  
  console.log("Matches found:", matches.length);
  matches.forEach((m, i) => {
    console.log(`  ${i + 1}. Key: "${m.key}", Value: "${m.value}"`);
  });
  
  if (matches.length === 0) {
    console.log("❌ NO MATCHES - This explains why isUrlencoded flags aren't being set!");
    
    console.log("\n🔧 Testing improved regex patterns:");
    
    // More flexible patterns to test
    const testPatterns = [
      {
        name: "Allow single quotes only",
        regex: /--data-urlencode\s+'([^=]+)=([^']+)'/g
      },
      {
        name: "Allow double quotes only", 
        regex: /--data-urlencode\s+"([^=]+)=([^"]+)"/g
      },
      {
        name: "Allow both quote types (flexible)",
        regex: /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]]/g
      },
      {
        name: "More flexible whitespace and quotes",
        regex: /--data-urlencode\s+['"]?([^=\s]+)=([^'"\s\\]+)['"]?/g
      }
    ];
    
    testPatterns.forEach(pattern => {
      console.log(`\n📋 Testing: ${pattern.name}`);
      console.log(`Regex: ${pattern.regex}`);
      
      const testMatches = [];
      let testMatch;
      const testRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((testMatch = testRegex.exec(curlCommand)) !== null) {
        testMatches.push({
          key: testMatch[1],
          value: testMatch[2]
        });
      }
      
      console.log(`Matches: ${testMatches.length}`);
      testMatches.forEach((m, i) => {
        console.log(`  ${i + 1}. "${m.key}" = "${m.value}"`);
      });
    });
  } else {
    console.log("✅ Regex is working correctly!");
  }
}

testDataUrlencodeRegex();