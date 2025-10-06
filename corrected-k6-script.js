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
    {"duration": "1m", "target": 20},
    {"duration": "3m", "target": 20},
    {"duration": "1m", "target": 50},
    {"duration": "2m", "target": 50},
    {"duration": "1m", "target": 0}
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

// ✅ CORRECTED Flow scenarios based on your ACTUAL graph
const FLOW_SCENARIOS = [
  {
    "name": "Send_Money_Success",
    "startInput": "334",
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"},
      {"input": "1", "nodeType": "MENU"}, // Option 1: Send Money
      {"input": "*", "storeAttribute": "SENDMONEYAMOUNT", "nodeType": "INPUT"},
      {"input": "*", "storeAttribute": "SENDMONEYRECIVERMSISDN", "nodeType": "INPUT"}
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "1. Send Money\n2. Pay Bills", "nodeType": "MENU"},
      {"expectedResponse": "Please enter your amount:", "nodeType": "INPUT"},
      {"expectedResponse": "Please enter your receiver Mobile Number:", "nodeType": "INPUT"},
      {"expectedResponse": "Thank you for using our service! transaction successfull with :sendMoneytransactionId", "nodeType": "END"}
    ]
  },
  {
    "name": "Send_Money_Failed",
    "startInput": "334", 
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"},
      {"input": "1", "nodeType": "MENU"}, // Option 1: Send Money
      {"input": "*", "storeAttribute": "SENDMONEYAMOUNT", "nodeType": "INPUT"},
      {"input": "*", "storeAttribute": "SENDMONEYRECIVERMSISDN", "nodeType": "INPUT"}
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "1. Send Money\n2. Pay Bills", "nodeType": "MENU"},
      {"expectedResponse": "Please enter your amount:", "nodeType": "INPUT"},
      {"expectedResponse": "Please enter your receiver Mobile Number:", "nodeType": "INPUT"},
      {"expectedResponse": "Sorry transaction failed !!", "nodeType": "END"}
    ]
  },
  {
    "name": "Pay_Bills_Success",
    "startInput": "334",
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"},
      {"input": "2", "nodeType": "MENU"}, // Option 2: Pay Bills
      {"input": "*", "nodeType": "DYNAMIC-MENU"}, // Select from dynamic biller list
      {"input": "*", "storeAttribute": "BILLERAMOUNT", "nodeType": "INPUT"}
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "1. Send Money\n2. Pay Bills", "nodeType": "MENU"},
      {"expectedResponse": "1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service", "nodeType": "DYNAMIC-MENU"},
      {"expectedResponse": "Please enter your billpay amount:", "nodeType": "INPUT"},
      {"expectedResponse": "Thank you for using our service! BILL PAY :billPaytransactionId", "nodeType": "END"}
    ]
  },
  {
    "name": "Pay_Bills_Failed",
    "startInput": "334",
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"},
      {"input": "2", "nodeType": "MENU"}, // Option 2: Pay Bills
      {"input": "*", "nodeType": "DYNAMIC-MENU"}, // Select from dynamic biller list
      {"input": "*", "storeAttribute": "BILLERAMOUNT", "nodeType": "INPUT"}
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "1. Send Money\n2. Pay Bills", "nodeType": "MENU"},
      {"expectedResponse": "1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service", "nodeType": "DYNAMIC-MENU"},
      {"expectedResponse": "Please enter your billpay amount:", "nodeType": "INPUT"},
      {"expectedResponse": "Thank you for using our service! Service Not available", "nodeType": "END"}
    ]
  },
  {
    "name": "PIN_Validation_Failed",
    "startInput": "334",
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"}
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "Thank you for using our service! Error", "nodeType": "END"}
    ]
  },
  {
    "name": "Biller_Service_Unavailable",
    "startInput": "334",
    "steps": [
      {"input": "*", "storeAttribute": "USERPIN", "nodeType": "INPUT"},
      {"input": "2", "nodeType": "MENU"} // Option 2: Pay Bills but service fails
    ],
    "assertions": [
      {"expectedResponse": "Please enter your pin:", "nodeType": "INPUT"},
      {"expectedResponse": "1. Send Money\n2. Pay Bills", "nodeType": "MENU"},
      {"expectedResponse": "Thank you for using our service! Error", "nodeType": "END"}
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

function generateDynamicValue(storeAttribute) {
  if (!storeAttribute) return 'DEFAULT_VALUE';
  
  const attr = storeAttribute.toUpperCase();
  
  switch (true) {
    case attr.includes('PIN'):
      return ['1234', '5678', '1111', '0000', '9999'][Math.floor(Math.random() * 5)];
    case attr.includes('AMOUNT'):
      return [10, 25, 50, 100, 200, 500, 1000, 2000, 5000][Math.floor(Math.random() * 9)].toString();
    case attr.includes('MSISDN'):
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

function validateResponse(response, assertion, stepIndex, scenarioName) {
  console.log(`🔍 Step ${stepIndex} Validation (${assertion.nodeType}):`);
  console.log(`📥 ACTUAL: "${response.body ? response.body.trim() : 'NO BODY'}"`);
  console.log(`📋 EXPECTED: "${assertion.expectedResponse}"`);
  
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  if (response.body && assertion.expectedResponse) {
    checks['content validation'] = (r) => {
      const bodyLower = r.body.toLowerCase();
      const expectedLower = assertion.expectedResponse.toLowerCase();
      
      // Simple content matching based on node type
      if (assertion.nodeType === 'MENU') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        return hasMenuNumbers || containsExpected;
      }
      
      if (assertion.nodeType === 'INPUT') {
        const inputKeywords = ['enter', 'input', 'provide'];
        const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower);
        return hasInputKeyword || containsExpected;
      }
      
      if (assertion.nodeType === 'DYNAMIC-MENU') {
        const hasMenuNumbers = /\d+\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        return hasMenuNumbers || containsExpected;
      }
      
      if (assertion.nodeType === 'END') {
        // For END nodes, check for key completion words
        const completionKeywords = ['thank', 'success', 'complete', 'transaction', 'failed', 'error', 'not available'];
        const hasCompletionKeyword = completionKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower.split(':')[0]); // Handle dynamic content
        return hasCompletionKeyword || containsExpected;
      }
      
      return bodyLower.includes(expectedLower);
    };
  }
  
  const result = check(response, checks);
  
  console.log(`📊 Result: ${result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`─────────────────────────────────────`);
  
  return result;
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Select random scenario
  const scenario = FLOW_SCENARIOS[Math.floor(Math.random() * FLOW_SCENARIOS.length)];
  
  console.log(`🚀 Starting scenario: ${scenario.name} for ${phoneNumber}`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  
  try {
    // Step 1: Initiate USSD session (334)
    const { response: startResponse } = makeUSSDRequest(sessionId, phoneNumber, scenario.startInput, 1);
    
    // Validate start response (PIN prompt)
    if (!validateResponse(startResponse, scenario.assertions[0], 0, scenario.name)) {
      errorRate.add(1);
      return;
    }
    
    sleep(1 + Math.random() * 2);
    
    // Step 2: Process each step in sequence
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      let processedInput = step.input;
      
      // Generate dynamic input values
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
        console.log(`🔄 Dynamic input: ${step.storeAttribute} -> ${processedInput}`);
      }
      
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      
      // Validate response against next assertion
      const assertionIndex = i + 1; // Next assertion after current step
      if (assertionIndex < scenario.assertions.length) {
        if (!validateResponse(response, scenario.assertions[assertionIndex], i + 1, scenario.name)) {
          errorRate.add(1);
          console.log(`❌ Step ${i + 1} failed validation`);
          return;
        }
      }
      
      // Check if this is the last step
      if (i === scenario.steps.length - 1) {
        flowCompleted = true;
        console.log(`✅ Flow completed successfully for ${phoneNumber}`);
      }
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0);
    sessionDuration.add(Date.now() - sessionStart);
    
  } catch (error) {
    console.error(`Error in scenario ${scenario.name}:`, error.message);
    errorRate.add(1);
  }
  
  sleep(2 + Math.random() * 3);
}

export function setup() {
  console.log('🚀 CORRECTED USSD Load Test Started');
  console.log(`Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  console.log(`Scenarios: ${FLOW_SCENARIOS.length}`);
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 Load Test Completed');
  console.log(`Started at: ${data.timestamp}`);
}