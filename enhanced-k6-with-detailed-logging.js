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

// Sample scenario for testing
const FLOW_SCENARIOS = [
  {
    "name": "Test_Enhanced_Logging",
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
        "expectedResponse": "1. Send Money\n2. Pay Bills",
        "nodeType": "MENU", 
        "assertionType": "menu"
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
  
  console.log(`[<nowiki>${new Date().toISOString()}</nowiki>] ${input} -> ${response.status} (${duration}ms)`);
  
  return { response, duration };
}

// ENHANCED VALIDATION FUNCTION WITH DETAILED LOGGING
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
    checks['content validation'] = (r) => {
      const bodyLower = r.body.toLowerCase();
      const expectedLower = assertion.expectedResponse.toLowerCase();
      
      console.log(`🔍 Content Matching Check:`);
      console.log(`  Body (lowercase): "${bodyLower}"`);
      console.log(`  Expected (lowercase): "${expectedLower}"`);
      
      // For input nodes
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

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  const scenario = FLOW_SCENARIOS[0]; // Use first scenario
  
  console.log(`🚀 Starting Enhanced Logging Test: ${scenario.name} for ${phoneNumber}`);
  
  try {
    // Test first step
    const { response } = makeUSSDRequest(sessionId, phoneNumber, scenario.startInput, 1);
    
    // Validate with enhanced logging
    if (scenario.assertions.length > 0) {
      const assertion = scenario.assertions[0];
      const validationResult = validateResponse(response, assertion, 1, scenario.name);
      
      if (!validationResult) {
        console.log(`❌ Step 1 failed validation`);
        errorRate.add(1);
        stepFailureRate.add(1);
      } else {
        console.log(`✅ Step 1 passed validation`);
      }
    }
    
  } catch (error) {
    console.error(`Error in scenario ${scenario.name}:`, error.message);
    errorRate.add(1);
  }
  
  sleep(1);
}

export function setup() {
  console.log('🚀 Enhanced Logging USSD Load Test Started');
  console.log(`Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 Enhanced Logging Load Test Completed');
  console.log(`Started at: ${data.timestamp}`);
}