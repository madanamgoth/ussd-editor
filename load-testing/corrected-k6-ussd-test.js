import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for enhanced monitoring
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const dynamicInputSuccess = new Rate('dynamic_input_success');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 }
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
    testType: 'corrected_ussd_flow_test',
    generator: 'corrected-k6-script',
    version: '2025-10-03'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: 'http://10.22.21.207:9401',
  ENDPOINT: '/MenuManagement/RequestReceiver',
  LOGIN: 'Ussd_Bearer1',
  PASSWORD: 'test',
  PHONE_PREFIX: '777',
  SESSION_ID_PREFIX: '99',
};

// Corrected flow scenarios based on actual USSD behavior
const CORRECTED_SCENARIOS = [
  {
    name: 'Send_Money_Success_Flow',
    description: 'Complete Send Money transaction with success',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'USERPIN', expected: '1. Send Money\n2. Pay Bills', nodeType: 'INPUT' },
      { input: '1', expected: 'Please enter your amount:', nodeType: 'MENU' },
      { input: 'SENDMONEYAMOUNT', expected: 'Please enter recipient phone:', nodeType: 'INPUT' },
      { input: 'RECIPIENTPHONE', expected: 'Your transaction of :SENDMONEYAMOUNT to :RECIPIENTPHONE was successful', nodeType: 'INPUT' }
    ]
  },
  {
    name: 'Send_Money_Failed_Flow',
    description: 'Send Money transaction with failure',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'USERPIN', expected: '1. Send Money\n2. Pay Bills', nodeType: 'INPUT' },
      { input: '1', expected: 'Please enter your amount:', nodeType: 'MENU' },
      { input: 'LARGEMONEYAMOUNT', expected: 'Transaction failed: Insufficient balance', nodeType: 'INPUT' }
    ]
  },
  {
    name: 'Pay_Bills_Success_Flow',
    description: 'Complete Pay Bills transaction with success',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'USERPIN', expected: '1. Send Money\n2. Pay Bills', nodeType: 'INPUT' },
      { input: '2', expected: 'Select bill type:', nodeType: 'MENU' },
      { input: 'BILLTYPE', expected: 'Please enter amount:', nodeType: 'DYNAMIC-MENU' },
      { input: 'BILLAMOUNT', expected: 'BILL PAY successful. Transaction ID:', nodeType: 'INPUT' }
    ]
  },
  {
    name: 'Pay_Bills_Failed_Flow',
    description: 'Pay Bills transaction with failure',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'USERPIN', expected: '1. Send Money\n2. Pay Bills', nodeType: 'INPUT' },
      { input: '2', expected: 'Select bill type:', nodeType: 'MENU' },
      { input: 'BILLTYPE', expected: 'Please enter amount:', nodeType: 'DYNAMIC-MENU' },
      { input: 'LARGEBILLAMOUNT', expected: 'Bill payment failed: Insufficient funds', nodeType: 'INPUT' }
    ]
  },
  {
    name: 'Wrong_PIN_Flow',
    description: 'Authentication failure with wrong PIN',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'WRONGPIN', expected: 'Invalid PIN. Please try again or contact support.', nodeType: 'INPUT' }
    ]
  },
  {
    name: 'Service_Unavailable_Flow',
    description: 'Service temporarily unavailable',
    startInput: '334',
    steps: [
      { input: '334', expected: 'Please enter your pin:', nodeType: 'START' },
      { input: 'USERPIN', expected: '1. Send Money\n2. Pay Bills', nodeType: 'INPUT' },
      { input: '1', expected: 'Please enter your amount:', nodeType: 'MENU' },
      { input: 'SENDMONEYAMOUNT', expected: 'Please enter recipient phone:', nodeType: 'INPUT' },
      { input: 'INVALIDPHONE', expected: 'Service temporarily unavailable. Please try again later.', nodeType: 'INPUT' }
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

// Generate dynamic values based on variable type
function generateDynamicValue(variableType) {
  const values = {
    'USERPIN': ['1234', '5678', '1111', '0000'],
    'WRONGPIN': ['9999', '0001', '1357', '2468'],
    'SENDMONEYAMOUNT': ['50', '100', '250', '500', '1000'],
    'LARGEMONEYAMOUNT': ['50000', '100000', '250000'],
    'BILLAMOUNT': ['25', '75', '150', '300'],
    'LARGEBILLAMOUNT': ['25000', '50000', '100000'],
    'RECIPIENTPHONE': ['77712345678', '77787654321', '77756781234', '77834567890'],
    'INVALIDPHONE': ['123456789', '999999999', '000000000'],
    'BILLTYPE': ['1', '2', '3'],
  };
  
  const options = values[variableType] || ['DEFAULT'];
  const selected = options[Math.floor(Math.random() * options.length)];
  return selected;
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

function validateResponse(response, expectedContent, stepIndex, scenarioName, nodeType) {
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    node_type: nodeType
  };
  
  // Enhanced logging
  console.log(`🔍 Step ${stepIndex} Validation (${nodeType}):`);
  console.log(`📥 ACTUAL RESPONSE: "${response.body ? response.body.trim() : 'NO BODY'}"`);
  console.log(`📋 EXPECTED: "${expectedContent}"`);
  console.log(`📊 Status: ${response.status}, Duration: ${response.timings.duration}ms`);
  
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'content validation': (r) => validateContent(r, expectedContent, nodeType),
    'no error indicators': (r) => !hasErrorIndicators(r.body)
  };
  
  const result = check(response, checks, tags);
  
  // Enhanced content validation logging
  console.log(`🔍 Content Matching Check:`);
  console.log(`  Body (lowercase): "${response.body.toLowerCase()}"`);
  console.log(`  Expected (lowercase): "${expectedContent.toLowerCase()}"`);
  
  const contentResult = validateContent(response, expectedContent, nodeType);
  console.log(`  ${nodeType} validation result: ${contentResult ? 'PASSED' : 'FAILED'}`);
  
  const errorIndicators = hasErrorIndicators(response.body);
  console.log(`${errorIndicators ? '❌' : '✅'} ${errorIndicators ? 'Error indicators found' : 'No error indicators found'}`);
  
  console.log(`📊 Validation Summary for Step ${stepIndex}:`);
  console.log(`  Overall Result: ${result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Node Type: ${nodeType}`);
  console.log(`  Assertion Type: ${getAssertionType(nodeType)}`);
  console.log(`─────────────────────────────────────`);
  
  return result;
}

function validateContent(response, expectedContent, nodeType) {
  if (!response.body || !expectedContent) return false;
  
  const bodyLower = response.body.toLowerCase().trim();
  const expectedLower = expectedContent.toLowerCase().trim();
  
  switch (nodeType) {
    case 'START':
    case 'INPUT':
      // Look for input prompts
      const inputKeywords = ['enter', 'input', 'provide', 'pin'];
      const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
      const containsExpected = bodyLower.includes(expectedLower);
      console.log(`  Input keywords found: ${hasInputKeyword}`);
      console.log(`  Contains expected text: ${containsExpected}`);
      return hasInputKeyword || containsExpected;
      
    case 'MENU':
    case 'DYNAMIC-MENU':
      // Look for menu structure
      const hasMenuNumbers = /\d+\./.test(response.body);
      const containsMenuExpected = bodyLower.includes(expectedLower);
      console.log(`  Menu numbers found: ${hasMenuNumbers}`);
      console.log(`  Contains expected text: ${containsMenuExpected}`);
      return hasMenuNumbers || containsMenuExpected;
      
    case 'END':
      // Look for completion messages with flexible matching
      const successKeywords = ['successful', 'success', 'complete', 'transaction', 'thank'];
      const failureKeywords = ['failed', 'error', 'invalid', 'insufficient', 'unavailable'];
      
      // Extract template parts (remove :VARIABLE patterns)
      const templateParts = expectedLower
        .split(/:[a-zA-Z_][a-zA-Z0-9_]*/)
        .filter(part => part.trim().length > 2)
        .map(part => part.trim());
      
      console.log(`🔍 END Node Dynamic Content Validation:`);
      console.log(`  Expected template: "${expectedContent}"`);
      console.log(`  Actual response: "${response.body}"`);
      console.log(`  Static parts to find: [${templateParts.join(', ')}]`);
      
      const partsFound = templateParts.filter(part => bodyLower.includes(part));
      console.log(`  Parts found: [${partsFound.join(', ')}]`);
      
      if (templateParts.length > 0) {
        const matchPercentage = partsFound.length / templateParts.length;
        if (matchPercentage >= 0.5) { // 50% match threshold
          console.log(`✅ END node validation: Found ${partsFound.length}/${templateParts.length} key parts (${Math.round(matchPercentage * 100)}%) - PASSED`);
          return true;
        }
        console.log(`❌ END node validation: Only found ${partsFound.length}/${templateParts.length} key parts (${Math.round(matchPercentage * 100)}%) - FAILED`);
      }
      
      // Check for success/failure indicators
      const hasSuccessKeywords = successKeywords.some(keyword => bodyLower.includes(keyword));
      const hasFailureKeywords = failureKeywords.some(keyword => bodyLower.includes(keyword));
      
      return hasSuccessKeywords || hasFailureKeywords || bodyLower.includes(expectedLower);
      
    default:
      return bodyLower.includes(expectedLower) || expectedLower.includes(bodyLower);
  }
}

function hasErrorIndicators(body) {
  if (!body) return false;
  const errorKeywords = ['error', 'invalid', 'failed', 'wrong', 'denied', 'expired'];
  return errorKeywords.some(keyword => body.toLowerCase().includes(keyword));
}

function getAssertionType(nodeType) {
  const types = {
    'START': 'input',
    'INPUT': 'input',
    'MENU': 'menu',
    'DYNAMIC-MENU': 'dynamic_menu',
    'END': 'end'
  };
  return types[nodeType] || 'generic';
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Select random scenario
  const scenario = CORRECTED_SCENARIOS[Math.floor(Math.random() * CORRECTED_SCENARIOS.length)];
  
  console.log(`🚀 Starting Canvas Graph scenario: ${scenario.name} for ${phoneNumber}`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  let stepsPassed = 0;
  
  const sessionTags = {
    scenario_name: scenario.name,
    phone_number: phoneNumber.substring(0, 3) + 'XXX'
  };
  
  try {
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      let processedInput = step.input;
      
      // Handle dynamic inputs
      if (step.input.includes('USER') || step.input.includes('AMOUNT') || step.input.includes('PHONE') || step.input.includes('BILL') || step.input.includes('WRONG')) {
        processedInput = generateDynamicValue(step.input);
        console.log(`🔄 Dynamic input: ${step.input} -> ${processedInput}`);
        dynamicInputSuccess.add(1, { ...sessionTags, step: i });
      }
      
      // Make USSD request
      const newRequest = (i === 0) ? 1 : 0; // First request is new session
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, newRequest);
      
      // Validate response
      const isValid = validateResponse(response, step.expected, i, scenario.name, step.nodeType);
      
      if (isValid) {
        stepsPassed++;
        console.log(`✅ Step ${i} validation passed`);
      } else {
        console.log(`❌ Step ${i} failed validation`);
        stepFailureRate.add(1, { ...sessionTags, step: i });
        break; // Stop on first failure
      }
      
      // Check if this is the last step
      if (i === scenario.steps.length - 1) {
        flowCompleted = true;
        console.log(`✅ Flow completed successfully for ${phoneNumber}`);
      }
      
      // Add realistic delay between steps
      sleep(1 + Math.random() * 2);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
    if (!flowCompleted) {
      errorRate.add(1, sessionTags);
    }
    
  } catch (error) {
    console.error(`Error in scenario ${scenario.name}:`, error.message);
    errorRate.add(1, sessionTags);
    flowCompletionRate.add(0, sessionTags);
  }
  
  sleep(2 + Math.random() * 3);
}

export function setup() {
  console.log('🚀 Canvas Graph USSD Load Test Started');
  console.log(`Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  console.log(`Scenarios: ${CORRECTED_SCENARIOS.length}`);
  console.log(`Graph-based flow testing with dynamic inputs`);
  
  return {
    timestamp: new Date().toISOString(),
    scenarios: CORRECTED_SCENARIOS.length
  };
}

export function teardown(data) {
  console.log('📊 Canvas Graph Load Test Completed');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Scenarios tested: ${data.scenarios}`);
}