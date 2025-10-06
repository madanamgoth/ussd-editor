// Example: Multiple test cases per session (Sequential execution)

export default function () {
  const phoneNumber = generatePhoneNumber();
  const baseSessionId = generateSessionId();
  
  console.log(`🚀 Starting multi-test session for ${phoneNumber}`);
  
  // Define how many test cases per session
  const TEST_CASES_PER_SESSION = 3;
  const testCasesToRun = [
    FLOW_SCENARIOS[0], // Path_1: Send Money Success
    FLOW_SCENARIOS[2], // Path_3: Pay Bills Success  
    FLOW_SCENARIOS[5]  // Path_6: Pay Bills Direct Error
  ];
  
  // Execute test cases SEQUENTIALLY
  for (let testIndex = 0; testIndex < TEST_CASES_PER_SESSION; testIndex++) {
    // Generate unique session ID for each test within the same VU
    const sessionId = baseSessionId + '_test_' + (testIndex + 1);
    const scenario = testCasesToRun[testIndex];
    
    console.log(`📋 Test ${testIndex + 1}/${TEST_CASES_PER_SESSION}: ${scenario.name}`);
    console.log(`   Session: ${sessionId}, Phone: ${phoneNumber}`);
    
    try {
      // Execute the complete scenario
      const result = executeCompleteScenario(scenario, sessionId, phoneNumber);
      
      if (result.success) {
        console.log(`✅ Test ${testIndex + 1} completed successfully`);
      } else {
        console.log(`❌ Test ${testIndex + 1} failed: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`💥 Test ${testIndex + 1} crashed: ${error.message}`);
    }
    
    // Wait between test cases in same session group
    if (testIndex < TEST_CASES_PER_SESSION - 1) {
      console.log(`⏳ Waiting before next test...`);
      sleep(2 + Math.random() * 3);
    }
  }
  
  console.log(`🏁 Completed all ${TEST_CASES_PER_SESSION} tests for VU session`);
  sleep(1); // Final rest before VU ends
}

function executeCompleteScenario(scenario, sessionId, phoneNumber) {
  const sessionStart = Date.now();
  
  try {
    // Step 1: Initiate USSD session
    const { response: startResponse } = makeUSSDRequest(
      sessionId, phoneNumber, scenario.startInput, 1
    );
    
    // Validate start response
    if (scenario.assertions.length > 0) {
      if (!validateResponse(startResponse, scenario.assertions[0], 0, scenario.name)) {
        return { success: false, error: 'Start validation failed' };
      }
    }
    
    sleep(1);
    
    // Step 2: Process each step
    let assertionIndex = 1;
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      
      let processedInput = step.input;
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
      }
      
      if (step.nodeType === 'ACTION') {
        console.log(`⚙️ Processing ACTION node automatically`);
        continue;
      }
      
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      
      if (assertionIndex < scenario.assertions.length) {
        const assertion = scenario.assertions[assertionIndex];
        if (!validateResponse(response, assertion, i + 1, scenario.name)) {
          return { success: false, error: `Step ${i + 1} validation failed` };
        }
        assertionIndex++;
      }
      
      sleep(0.5);
    }
    
    const duration = Date.now() - sessionStart;
    console.log(`✅ Scenario completed in ${duration}ms`);
    return { success: true, duration: duration };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}