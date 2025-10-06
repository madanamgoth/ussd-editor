/**
 * Enhanced K6 Test Script with Detailed Logging
 * Based on your failing test case but with enhanced validation logging
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for Canvas Graph USSD testing
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const dynamicInputSuccess = new Rate('dynamic_input_success');

// Test configuration - reduced load for debugging
export const options = {
  stages: [
    { "duration": "30s", "target": 5 },  // Reduced for debugging
    { "duration": "1m", "target": 5 },   // Maintain low load
    { "duration": "30s", "target": 0 }   // Ramp down
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.05'],
    flow_completion: ['rate>0.9'],
    step_failures: ['rate<0.05'],
    dynamic_input_success: ['rate>0.95']
  },

  tags: {
    testType: 'ussd_canvas_graph_debug',
    generator: 'k6-enhanced-logging',
    version: '2025-10-02'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: 'http://10.22.21.207:9402',
  ENDPOINT: '/MenuManagement/RequestReceiver',
  LOGIN: 'Ussd_Bearer1',
  PASSWORD: 'test',
  PHONE_PREFIX: '777',
  SESSION_ID_PREFIX: '99',
};

// Simple test scenario for debugging
const TEST_SCENARIO = {
  "name": "Debug_Flow_Path_1",
  "startInput": "123",
  "steps": [
    {
      "input": "123",
      "storeAttribute": null,
      "nodeType": "START",
      "nextNodeType": "INPUT",
      "isActionNode": false
    },
    {
      "input": "*",
      "storeAttribute": "USERPIN",
      "nodeType": "INPUT",
      "nextNodeType": "MENU",
      "isActionNode": false
    },
    {
      "input": "1",
      "storeAttribute": null,
      "nodeType": "MENU",
      "nextNodeType": "END",
      "isActionNode": false
    }
  ],
  "assertions": [
    {
      "expectedResponse": "Please enter your pin:",
      "nodeType": "INPUT",
      "assertionType": "input"
    },
    {
      "expectedResponse": "1. Send Money\n2. Pay Bills",
      "nodeType": "MENU",
      "assertionType": "menu"
    },
    {
      "expectedResponse": "Thank you for using our service!",
      "nodeType": "END",
      "assertionType": "end"
    }
  ]
};

// Utility functions
function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

function generateDynamicValue(storeAttribute) {
  if (!storeAttribute) return 'DEFAULT_VALUE';
  
  const attr = storeAttribute.toUpperCase();
  
  switch (true) {
    case attr.includes('PIN') || attr.includes('PASSWORD'):
      return ['1234', '5678', '1111', '0000', '9999'][Math.floor(Math.random() * 5)];
    
    case attr.includes('AMOUNT') || attr.includes('MONEY'):
      return [10, 25, 50, 100, 200, 500, 1000][Math.floor(Math.random() * 7)].toString();
    
    case attr.includes('PHONE') || attr.includes('MSISDN'):
      const prefixes = ['777', '778', '779', '770'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      return prefix + suffix;
    
    default:
      return 'DEFAULT_VALUE';
  }
}

function makeUSSDRequest(sessionId, msisdn, input, newRequest = 0) {
  const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`;
  const params = {
    LOGIN: CONFIG.LOGIN,
    PASSWORD: CONFIG.PASSWORD,
    SESSION_ID: sessionId,
    MSISDN: msisdn,
    NewRequest: newRequest,
    INPUT: input
  };
  
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const fullUrl = `${url}?${queryString}`;
  
  const startTime = Date.now();
  const response = http.get(fullUrl);
  const duration = Date.now() - startTime;
  
  console.log(`[${new Date().toISOString()}] ${input} -> ${response.status} (${duration}ms)`);
  
  return { response, duration };
}

// ENHANCED VALIDATION FUNCTION WITH DETAILED LOGGING
function validateResponse(response, assertion, stepIndex, scenarioName) {
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    assertion_type: assertion.assertionType
  };
  
  // 🔍 ENHANCED LOGGING - Show what we're comparing
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
    // Enhanced content validation with detailed logging
    checks['content validation'] = (r) => {
      const bodyLower = r.body.toLowerCase();
      const expectedLower = assertion.expectedResponse.toLowerCase();
      
      console.log(`🔍 Content Matching Check:`);
      console.log(`  Body (lowercase): "${bodyLower}"`);
      console.log(`  Expected (lowercase): "${expectedLower}"`);
      
      // For menu responses, check for menu structure
      if (assertion.nodeType === 'MENU') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(`  Menu numbers found: ${hasMenuNumbers}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  MENU validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }
      
      // For input prompts, check for key phrases
      if (assertion.nodeType === 'INPUT') {
        const inputKeywords = ['enter', 'input', 'provide', 'type', 'pin'];
        const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasInputKeyword || containsExpected;
        
        console.log(`  Input keywords found: ${hasInputKeyword}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  INPUT validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }
      
      // For END nodes
      if (assertion.nodeType === 'END') {
        const containsExpected = bodyLower.includes(expectedLower);
        const hasCompletionWords = ['thank', 'success', 'complete', 'transaction'].some(word => bodyLower.includes(word));
        const result = containsExpected || hasCompletionWords;
        
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  Has completion words: ${hasCompletionWords}`);
        console.log(`  END validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }
      
      // General content matching
      const result = bodyLower.includes(expectedLower) || expectedLower.includes(bodyLower);
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
  
  // 📊 FINAL VALIDATION SUMMARY
  console.log(`📊 Validation Summary for Step ${stepIndex}:`);
  console.log(`  Overall Result: ${result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Node Type: ${assertion.nodeType}`);
  console.log(`  Assertion Type: ${assertion.assertionType}`);
  console.log(`─────────────────────────────────────`);
  
  return result;
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  console.log(`🚀 Starting Debug scenario: ${TEST_SCENARIO.name} for ${phoneNumber}`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  
  const sessionTags = {
    scenario_name: TEST_SCENARIO.name,
    phone_number: phoneNumber.substring(0, 3) + 'XXX'
  };
  
  try {
    // Step 1: Initiate USSD session
    const { response: startResponse } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      TEST_SCENARIO.startInput, 
      1
    );
    
    // Validate start response
    if (TEST_SCENARIO.assertions.length > 0) {
      const startAssertion = TEST_SCENARIO.assertions[0];
      if (!validateResponse(startResponse, startAssertion, 0, TEST_SCENARIO.name)) {
        console.log(`❌ Step 0 failed validation`);
        errorRate.add(1, sessionTags);
        stepFailureRate.add(1, { ...sessionTags, step: 0 });
        return;
      }
    }
    
    sleep(1 + Math.random() * 2);
    
    // Step 2: Process each step in the scenario
    let assertionIndex = 1; // Start from index 1 since we used 0 for start
    
    for (let i = 1; i < TEST_SCENARIO.steps.length; i++) {
      const step = TEST_SCENARIO.steps[i];
      
      let processedInput = step.input;
      
      // Handle dynamic inputs
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
        console.log(`🔄 Dynamic input: ${step.storeAttribute} -> ${processedInput}`);
        dynamicInputSuccess.add(1, { ...sessionTags, attribute: step.storeAttribute });
      }
      
      // Make the request
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      
      // Validate response if assertion exists for this step
      if (assertionIndex < TEST_SCENARIO.assertions.length) {
        const assertion = TEST_SCENARIO.assertions[assertionIndex];
        if (assertion && !validateResponse(response, assertion, i, TEST_SCENARIO.name)) {
          errorRate.add(1, { ...sessionTags, step: i });
          stepFailureRate.add(1, { ...sessionTags, step: i });
          console.log(`❌ Step ${i} failed validation`);
          break;
        }
        assertionIndex++;
      }
      
      // Check if this is the last step
      if (i === TEST_SCENARIO.steps.length - 1) {
        flowCompleted = true;
        console.log(`✅ Debug flow completed successfully for ${phoneNumber}`);
      }
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
  } catch (error) {
    console.error(`Error in Debug scenario ${TEST_SCENARIO.name}:`, error.message);
    errorRate.add(1, sessionTags);
    flowCompletionRate.add(0, sessionTags);
  }
  
  sleep(2 + Math.random() * 3);
}

export function setup() {
  console.log('🚀 Enhanced K6 Debug Test Started');
  console.log(`Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  console.log(`Debug scenario: ${TEST_SCENARIO.name}`);
  console.log(`Enhanced logging enabled for detailed validation`);
  
  return {
    timestamp: new Date().toISOString(),
    scenario: TEST_SCENARIO.name
  };
}

export function teardown(data) {
  console.log('📊 Enhanced K6 Debug Test Completed');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Scenario tested: ${data.scenario}`);
}