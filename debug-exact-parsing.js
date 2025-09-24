// Test the exact parsing process for the user's GET curl command
const testExactParsing = () => {
  console.log('🧪 Testing exact parsing of user\'s GET curl command');
  console.log('='.repeat(60));

  const curlInput = `curl --location --request GET \\
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userName=madan' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \\
--header 'SkipSecurityHeaderValidation: true' \\
--header 'SkipPayloadEncryption: true' \\
--header 'X-Channel: WEB'`;

  // Simulate the exact parsing logic from parseCurlCommand
  let method = 'GET';
  let url = '';
  let headers = {};
  let body = {};
  let queryParams = {};

  console.log('📝 Step 1: Parse method');
  const methodMatch = curlInput.match(/(?:-X|--request)\s+([A-Z]+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  }
  console.log(`✅ Method: ${method}`);

  console.log('\n📝 Step 2: Parse URL');
  const urlMatches = [
    curlInput.match(/curl\s+(?:--location\s+(?:--request\s+\w+\s+)?)?\\?\s*['"]([^'"]+)['"]/),
    curlInput.match(/(?:--location|curl)\s+(?:--request\s+\w+\s+)?\\?\s*['"]([^'"]+)['"]/),
    curlInput.match(/--request\s+GET\s+\\?\s*['"]([^'"]+)['"]/),
    curlInput.match(/['"]([^'"]*https?:\/\/[^'"]*)['"]/),
    curlInput.match(/(https?:\/\/[^\s'"\\]+(?:\?[^\s'"\\\n]*)?)/),
  ];

  for (const match of urlMatches) {
    if (match && match[1]) {
      url = match[1];
      console.log(`✅ URL extracted: ${url}`);
      break;
    }
  }

  console.log('\n📝 Step 3: Parse headers');
  const headerRegex = /(?:-H|--header)\s+['"]([^:]+):\s*([^'"]+)['"]/g;
  let headerMatch;
  let headerCount = 0;
  while ((headerMatch = headerRegex.exec(curlInput)) !== null) {
    headers[headerMatch[1].trim()] = headerMatch[2].trim();
    headerCount++;
  }
  console.log(`✅ Headers found: ${headerCount}`);

  console.log('\n📝 Step 4: Parse --data-urlencode (should be none for GET)');
  const dataUrlencodeRegex = /--data-urlencode\s+['"]([^=]+)=([^'"]+)['"]/g;
  let urlencodeMatch;
  let urlencodeCount = 0;
  while ((urlencodeMatch = dataUrlencodeRegex.exec(curlInput)) !== null) {
    const key = urlencodeMatch[1].trim();
    const value = urlencodeMatch[2].trim();
    body[key] = value;
    urlencodeCount++;
  }
  console.log(`✅ --data-urlencode params: ${urlencodeCount}`);

  console.log('\n📝 Step 5: Extract query parameters from URL');
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
      console.log(`✅ Query param: ${key} = ${value}`);
    });
  } catch (urlError) {
    console.log('❌ URL parsing failed:', urlError);
  }

  console.log('\n📝 Step 6: Field extraction simulation');
  const allFields = [];

  // Extract header fields
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

  // Extract query parameter fields
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
    console.log(`✅ Added query field: ${paramName}`);
  });

  // Extract body fields (should be empty for GET)
  if (Object.keys(body).length > 0) {
    Object.keys(body).forEach(key => {
      allFields.push({
        path: key,
        value: body[key],
        type: 'string',
        category: 'body',
        mappingType: 'dynamic',
        storeAttribute: key,
        targetPath: key
      });
    });
  }

  console.log('\n📋 Final extracted fields:');
  allFields.forEach((field, index) => {
    if (field.category !== 'header') { // Skip headers for clarity
      console.log(`${index}: ${field.path} = "${field.value}" (${field.category}, ${field.mappingType})`);
    }
  });

  console.log('\n🎯 Analysis:');
  console.log(`Total fields: ${allFields.length}`);
  console.log(`Query fields: ${allFields.filter(f => f.category === 'query').length}`);
  console.log(`Body fields: ${allFields.filter(f => f.category === 'body').length}`);
  console.log(`Header fields: ${allFields.filter(f => f.category === 'header').length}`);

  const queryFields = allFields.filter(f => f.category === 'query');
  console.log('\n✅ Query fields that should be in JOLT:');
  queryFields.forEach(field => {
    console.log(`  ${field.storeAttribute} → BILLPAYMENTS.${field.storeAttribute}`);
  });

  console.log('\n❌ PASSWORD field should NOT be present!');
  const hasPasswordField = allFields.some(f => f.path.includes('PASSWORD') || f.storeAttribute === 'PASSWORD');
  console.log(`PASSWORD field found: ${hasPasswordField ? 'YES (BUG!)' : 'NO (CORRECT)'}`);

  console.log('\n' + '='.repeat(60));
  return allFields;
};

// Run the test
testExactParsing();