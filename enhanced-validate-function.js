// Enhanced validateResponse function with detailed logging
function validateResponse(response, assertion, stepIndex, scenarioName) {
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    assertion_type: assertion.assertionType
  };
  
  // Enhanced logging - show what we're comparing
  console.log(`🔍 Step ${stepIndex} Validation (${assertion.nodeType}):`);
  console.log(`📥 ACTUAL RESPONSE: "${response.body ? response.body.trim() : 'NO BODY'}"`);
  console.log(`📋 EXPECTED: "${assertion.expectedResponse}"`);
  console.log(`📊 Status: ${response.status}, Duration: ${response.timings.duration}ms`);

  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };

  if (response.body && assertion.expectedResponse) {
    // Enhanced content validation for Canvas Graph flows
    checks['content validation'] = (r) => {
      const bodyLower = r.body.toLowerCase();
      const expectedLower = assertion.expectedResponse.toLowerCase();
      
      console.log(`🔍 Content Matching Check:`);
      console.log(`  Body (lowercase): "${bodyLower}"`);
      console.log(`  Expected (lowercase): "${expectedLower}"`);

      // For menu nodes, check for menu structure
      if (assertion.nodeType === 'MENU') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(`  Menu numbers found: ${hasMenuNumbers}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  MENU validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }

      // For input nodes, check for input prompts
      if (assertion.nodeType === 'INPUT') {
        const inputKeywords = ['enter', 'input', 'provide'];
        const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasInputKeyword || containsExpected;
        
        console.log(`  Input keywords found: ${hasInputKeyword}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  INPUT validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }

      // For end nodes, enhanced validation with dynamic content handling
      if (assertion.nodeType === 'END') {
        console.log(`🔍 END Node Dynamic Content Validation:`);
        console.log(`  Expected template: "${assertion.expectedResponse}"`);
        console.log(`  Actual response: "${r.body}"`);
        
        // Handle dynamic content in END nodes (like transaction IDs)
        const actualBody = r.body.toLowerCase();
        const expectedText = assertion.expectedResponse.toLowerCase();

        // Extract static parts by removing dynamic placeholders
        const staticParts = expectedText
          .split(/:[a-zA-Z_][a-zA-Z0-9_]*/)  // Split on :variableName patterns
          .filter(part => part.trim().length > 3)  // Only keep meaningful parts (not just "with", etc.)
          .map(part => part.trim());
        
        console.log(`  Static parts to find: [${staticParts.join(', ')}]`);

        // Check if key static parts are present in the response
        const keyPartsFound = staticParts.filter(part =>
          actualBody.includes(part)
        );
        
        console.log(`  Parts found: [${keyPartsFound.join(', ')}]`);

        // Success if most key parts are found (flexible matching)
        const matchPercentage = staticParts.length > 0 ? (keyPartsFound.length / staticParts.length) : 0;

        if (matchPercentage >= 0.7 && keyPartsFound.length > 0) { // 70% match threshold
          console.log(`✅ END node validation: Found ${keyPartsFound.length}/${staticParts.length} key parts (${Math.round(matchPercentage * 100)}%) - PASSED`);
          return true;
        }

        // Fallback: check for completion keywords
        const completionKeywords = ['thank', 'success', 'complete', 'transaction'];
        const foundCompletionKeywords = completionKeywords.filter(keyword => actualBody.includes(keyword));
        const hasCompletionKeyword = foundCompletionKeywords.length > 0;

        if (hasCompletionKeyword) {
          console.log(`✅ END node validation: Found completion indicators [${foundCompletionKeywords.join(', ')}] - PASSED`);
          return true;
        }

        console.log(`❌ END node validation: Only found ${keyPartsFound.length}/${staticParts.length} key parts (${Math.round(matchPercentage * 100)}%) - FAILED`);
        return false;
      }
      
      // For dynamic menu responses
      if (assertion.nodeType === 'DYNAMIC-MENU') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(`  Dynamic menu numbers found: ${hasMenuNumbers}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  DYNAMIC-MENU validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }

      // General content matching
      const result = bodyLower.includes(expectedLower);
      console.log(`  General content match: ${result ? 'PASSED' : 'FAILED'}`);
      return result;
    };

    // Check for error indicators
    const errorKeywords = ['error', 'invalid', 'failed', 'wrong', 'denied'];
    checks['no error indicators'] = (r) => {
      const foundErrors = errorKeywords.filter(keyword => r.body.toLowerCase().includes(keyword));
      const hasErrors = foundErrors.length > 0;
      
      if (hasErrors) {
        console.log(`❌ Error indicators found: [${foundErrors.join(', ')}]`);
      } else {
        console.log(`✅ No error indicators found`);
      }
      
      return !hasErrors;
    };
  }

  const result = check(response, checks, tags);
  
  // Final validation summary
  console.log(`📊 Validation Summary for Step ${stepIndex}:`);
  console.log(`  Overall Result: ${result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Node Type: ${assertion.nodeType}`);
  console.log(`  Assertion Type: ${assertion.assertionType}`);
  console.log(`─────────────────────────────────────`);
  
  return result;
}