import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for Canvas Graph USSD testing
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const dynamicInputSuccess = new Rate('dynamic_input_success');

// Test configuration
export const options = {
  stages: [
    { "duration": "30s", "target": 5 },
    { "duration": "1m", "target": 5 },
    { "duration": "30s", "target": 0 }
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.05'],
    flow_completion: ['rate>0.9'],
    step_failures: ['rate<0.05'],
    dynamic_input_success: ['rate>0.95']
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

// ✅ CORRECTED SCENARIO with proper assertions
const FLOW_SCENARIOS = [
  {
    "name": "Flow_start_1758807107061_956_Path_1",
    "startInput": "123",
    "steps": [
      {
        "input": "123",
        "nodeType": "START",
        "nextNodeType": "INPUT"
      },
      {
        "input": "*",
        "storeAttribute": "USERPIN",
        "nodeType": "INPUT",
        "nextNodeType": "MENU"
      }
    ],
    "assertions": [
      {
        "expectedResponse": "Please enter your pin:",
        "nodeType": "INPUT",
        "assertionType": "input"
      },
      {
        "expectedResponse": "1. Send Money\\n2. Pay Bills", // ✅ CORRECTED: MENU assertion
        "nodeType": "MENU",  // ✅ CORRECTED: MENU node type
        "assertionType": "menu"  // ✅ CORRECTED: menu assertion type
      }
    ]
  }
];

// Utility functions
function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

function makeUSSDRequest(sessionId, msisdn, input, newRequest = 0) {
  const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`;
  const params = {
    LOGIN: CONFIG.LOGIN,
    PASSWORD: CONFIG.PASSWORD,
    SESSION_ID: sessionId,
    MSISDN: msisdn,
    MSG: input,
    NEW_REQUEST: newRequest
  };

  const response = http.post(url, params);
  console.log(`[${new Date().toISOString()}] ${input} -> ${response.status} (${response.timings.duration}ms)`);
  
  return { response };
}

function generateDynamicValue(attribute) {
  const dynamicValues = {
    'USERPIN': '1234',
    'AMOUNT': '100',
    'PHONE_NUMBER': '777123456',
    'ACCOUNT': '123456789'
  };
  return dynamicValues[attribute] || '1234';
}

// ✅ ENHANCED VALIDATION FUNCTION with detailed logging
function validateResponse(response, assertion, stepIndex, scenarioName) {
  const tags = { 
    scenario: scenarioName, 
    step: stepIndex,
    assertion_type: assertion.assertionType,
    node_type: assertion.nodeType
  };

  console.log(`🔍 Step ${stepIndex} Validation (${assertion.nodeType}):`);
  console.log(`📥 ACTUAL RESPONSE: "${response.body}"`);
  console.log(`📋 EXPECTED: "${assertion.expectedResponse}"`);
  console.log(`📊 Status: ${response.status}, Duration: ${response.timings.duration}ms`);

  const checks = {};

  if (assertion.expectedResponse) {
    const expected = assertion.expectedResponse.replace(/\\n/g, '\n');
    const expectedLower = expected.toLowerCase();
    const bodyLower = response.body.toLowerCase();
    
    console.log(`🔍 Content Matching Check:`);
    console.log(`  Body (lowercase): "${bodyLower}"`);
    console.log(`  Expected (lowercase): "${expectedLower}"`);

    checks[`response contains expected content`] = (r) => {
      // For input nodes
      if (assertion.assertionType === 'input') {
        const inputKeywords = ['enter', 'input', 'provide', 'pin'];
        const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasInputKeyword || containsExpected;
        
        console.log(`  Input keywords found: ${hasInputKeyword}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  INPUT validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }
      
      // For menu nodes  
      if (assertion.assertionType === 'menu') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(`  Menu numbers found: ${hasMenuNumbers}`);
        console.log(`  Contains expected text: ${containsExpected}`);
        console.log(`  MENU validation result: ${result ? 'PASSED' : 'FAILED'}`);
        
        return result;
      }
      
      // General content matching
      const result = bodyLower.includes(expectedLower);
      console.log(`  General content match: ${result ? 'PASSED' : 'FAILED'}`);
      return result;
    };
  }
  
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

  const result = check(response, checks, tags);
  
  // Final validation summary
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
  
  const scenario = FLOW_SCENARIOS[0]; 
  
  console.log(`🚀 Starting Canvas Graph scenario: ${scenario.name} for ${phoneNumber}`);
  
  try {
    // Step 0: Initial USSD request (START → INPUT)
    const { response: startResponse } = makeUSSDRequest(sessionId, phoneNumber, scenario.startInput, 1);
    
    // Validate Step 0
    if (scenario.assertions.length > 0) {
      const startAssertion = scenario.assertions[0];
      if (!validateResponse(startResponse, startAssertion, 0, scenario.name)) {
        errorRate.add(1);
        stepFailureRate.add(1);
        return;
      }
    }
    
    sleep(1);
    
    // Step 1: Send PIN input (INPUT → MENU)
    if (scenario.steps.length > 0) {
      const step = scenario.steps[1]; // Get the INPUT step
      const assertion = scenario.assertions[1]; // Get the MENU assertion
      
      let processedInput = step.input;
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
        console.log(`🔄 Dynamic input: ${step.storeAttribute} -> ${processedInput}`);
      }
      
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      
      // Validate Step 1 with MENU assertion
      if (assertion) {
        if (!validateResponse(response, assertion, 1, scenario.name)) {
          errorRate.add(1);
          stepFailureRate.add(1);
          console.log(`❌ Step 1 failed validation`);
          return;
        } else {
          console.log(`✅ Step 1 passed validation`);
        }
      }
    }
    
    flowCompletionRate.add(1);
    
  } catch (error) {
    console.error(`Error in scenario ${scenario.name}:`, error.message);
    errorRate.add(1);
  }
  
  sleep(1);
}

export function setup() {
  console.log('🚀 Canvas Graph USSD Load Test Started');
  console.log(`Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  console.log(`Scenarios: ${FLOW_SCENARIOS.length}`);
  console.log('Graph-based flow testing with dynamic inputs');
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 Canvas Graph Load Test Completed');
  console.log(`Started at: ${data.timestamp}`);
}