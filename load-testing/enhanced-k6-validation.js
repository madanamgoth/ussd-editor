// Enhanced K6 script with custom USSD validation
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const promptValidationRate = new Rate('prompt_validation');

// Configuration - UPDATE THESE FOR YOUR ENVIRONMENT
const CONFIG = {
  BASE_URL: 'http://localhost:80',
  ENDPOINT: '/MenuManagement/RequestReceiver',
  LOGIN: 'Ussd_Bearer1',
  PASSWORD: 'test',
  PHONE_PREFIX: '777',
  SESSION_ID_PREFIX: '99',
};

// CUSTOMIZE THESE VALIDATION PATTERNS FOR YOUR USSD RESPONSES
const VALIDATION_PATTERNS = {
  // Expected prompts for different menu levels
  MAIN_MENU: [
    'welcome', 'bienvenido', 'bienvenue', 'مرحباً',  // Welcome messages
    'select', 'choose', 'option', 'menu'              // Menu instructions
  ],
  
  // Success indicators
  SUCCESS_INDICATORS: [
    'success', 'successful', 'completed', 'thank you',
    'transaction complete', 'balance:', 'account'
  ],
  
  // Error indicators  
  ERROR_INDICATORS: [
    'error', 'invalid', 'failed', 'wrong', 'incorrect',
    'not found', 'unavailable', 'timeout', 'cancelled'
  ],
  
  // Language-specific patterns (if you use multiple languages)
  MULTILINGUAL: {
    english: ['press', 'enter', 'select', 'continue'],
    spanish: ['presiona', 'ingresa', 'selecciona', 'continúa'],
    french: ['appuyez', 'entrez', 'sélectionnez', 'continuez'],
    arabic: ['اضغط', 'أدخل', 'اختر', 'تابع']
  }
};

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
  
  // Enhanced logging with request details
  console.log(`📞 [${new Date().toISOString()}] MSISDN: ${msisdn} | Session: ${sessionId} | Input: "${input}" | Status: ${response.status} | Time: ${duration}ms`);
  
  return { response, duration };
}

function validateUSSDResponse(response, expectedType = 'menu') {
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  if (response.body) {
    const body = response.body.toLowerCase();
    console.log(`📄 Response body: "${response.body.substring(0, 100)}..."`);
    
    // Check for errors first
    const hasErrors = VALIDATION_PATTERNS.ERROR_INDICATORS.some(error => 
      body.includes(error.toLowerCase())
    );
    
    checks['no error indicators'] = (r) => !hasErrors;
    
    if (hasErrors) {
      console.log(`❌ Error detected in response: ${response.body}`);
      return check(response, checks);
    }
    
    // Validate based on expected response type
    switch (expectedType) {
      case 'menu':
        checks['contains menu content'] = (r) => 
          VALIDATION_PATTERNS.MAIN_MENU.some(keyword => 
            body.includes(keyword.toLowerCase())
          );
        break;
        
      case 'success':
        checks['contains success indicators'] = (r) => 
          VALIDATION_PATTERNS.SUCCESS_INDICATORS.some(keyword => 
            body.includes(keyword.toLowerCase())
          );
        break;
        
      case 'input':
        checks['prompts for input'] = (r) => 
          ['enter', 'input', 'type', 'ingresa', 'entrez'].some(keyword => 
            body.includes(keyword.toLowerCase())
          );
        break;
    }
    
    // Check for multilingual support
    const hasValidLanguage = Object.values(VALIDATION_PATTERNS.MULTILINGUAL)
      .some(languageWords => 
        languageWords.some(word => body.includes(word.toLowerCase()))
      );
      
    if (hasValidLanguage) {
      checks['contains valid language content'] = (r) => true;
    }
    
    // Custom prompt validation (ADD YOUR SPECIFIC CHECKS HERE)
    checks['custom prompt validation'] = (r) => {
      // Example: Check if response contains expected menu options
      const hasMenuOptions = /[1-9][\.\)]\s*/.test(r.body); // Matches "1. ", "2) ", etc.
      const hasInstructions = body.includes('select') || body.includes('choose') || body.includes('press');
      
      return hasMenuOptions || hasInstructions;
    };
  }
  
  const result = check(response, checks);
  promptValidationRate.add(result ? 1 : 0);
  
  return result;
}

// Enhanced test function with step-by-step validation
export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Your flow scenarios would be here (from the generated script)
  const scenario = {
    name: "Sample_Flow",
    startInput: "123",
    inputs: ["123", "1", "2"]
  };
  
  console.log(`🚀 Starting ${scenario.name} for ${phoneNumber}`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  
  try {
    // Step 1: Initiate USSD session
    console.log(`📱 Step 1: Initiating USSD session with input: ${scenario.startInput}`);
    const { response: startResponse } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      scenario.startInput, 
      1
    );
    
    if (!validateUSSDResponse(startResponse, 'menu')) {
      errorRate.add(1);
      console.log(`❌ Failed at USSD initiation`);
      return;
    }
    
    sleep(1 + Math.random() * 2);
    
    // Step 2: Process each input in the flow
    for (let i = 0; i < scenario.inputs.length; i++) {
      const input = scenario.inputs[i];
      const stepNumber = i + 2;
      
      console.log(`📱 Step ${stepNumber}: Sending input: ${input}`);
      
      const { response } = makeUSSDRequest(sessionId, phoneNumber, input, 0);
      
      // Determine expected response type based on input
      let expectedType = 'menu';
      if (i === scenario.inputs.length - 1) {
        expectedType = 'success'; // Last step should be success/completion
      } else if (input === '*') {
        expectedType = 'input'; // Might be prompting for input
      }
      
      if (!validateUSSDResponse(response, expectedType)) {
        errorRate.add(1);
        console.log(`❌ Flow failed at step ${stepNumber} with input: ${input}`);
        break;
      }
      
      if (i === scenario.inputs.length - 1) {
        flowCompleted = true;
        console.log(`✅ Flow completed successfully for ${phoneNumber}`);
      }
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0);
    sessionDuration.add(Date.now() - sessionStart);
    
  } catch (error) {
    console.error(`💥 Error in ${scenario.name}:`, error.message);
    errorRate.add(1);
    flowCompletionRate.add(0);
  }
  
  sleep(2 + Math.random() * 3);
}

function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 0 }    // Ramp down
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<3000'],        // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],            // Less than 10% failed requests
    errors: ['rate<0.05'],                    // Less than 5% errors
    flow_completion: ['rate>0.9'],            // More than 90% flow completion
    prompt_validation: ['rate>0.95'],         // More than 95% valid prompts
  },
};

export function setup() {
  console.log('🚀 Enhanced USSD Load Test Started');
  console.log(`📍 Target: ${CONFIG.BASE_URL}${CONFIG.ENDPOINT}`);
  console.log(`📱 Phone prefix: ${CONFIG.PHONE_PREFIX}`);
  console.log(`🆔 Session prefix: ${CONFIG.SESSION_ID_PREFIX}`);
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 Load Test Completed');
  console.log(`⏱️ Duration: ${Date.now() - new Date(data.timestamp).getTime()}ms`);
  console.log('📈 Check the results above for detailed metrics');
}
