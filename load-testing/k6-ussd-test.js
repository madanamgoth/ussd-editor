import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    // Load test
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up
        { duration: '5m', target: 20 },  // Sustained load
        { duration: '2m', target: 50 },  // Ramp up to peak
        { duration: '3m', target: 50 },  // Peak load
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up quickly
        { duration: '2m', target: 100 },  // Stress level
        { duration: '1m', target: 150 },  // Peak stress
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
    },
  },
  
  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    errors: ['rate<0.1'],              // Custom error rate below 10%
  },
};

// Test configuration
const BASE_URL = 'http://localhost:8080';
const USSD_CODES = ['*123#', '*456#', '*789#'];
const PHONE_PREFIXES = ['254700', '254701', '254702', '254703'];

// Utility functions
function generatePhoneNumber() {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const suffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return prefix + suffix;
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function randomUssdCode() {
  return USSD_CODES[Math.floor(Math.random() * USSD_CODES.length)];
}

// Test scenarios
export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  const ussdCode = randomUssdCode();
  
  // Randomly choose a test scenario
  const scenario = Math.random();
  
  if (scenario < 0.7) {
    // 70% - Complete USSD flow
    completeUssdFlow(phoneNumber, sessionId, ussdCode);
  } else if (scenario < 0.9) {
    // 20% - Menu navigation test
    menuNavigationTest(phoneNumber, sessionId, ussdCode);
  } else {
    // 10% - Error scenarios
    errorScenariosTest(phoneNumber, sessionId, ussdCode);
  }
  
  // Think time between iterations
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Complete USSD flow test
function completeUssdFlow(phoneNumber, sessionId, ussdCode) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Step 1: Initiate USSD session
  const startPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    ussdCode: ussdCode,
    text: ''
  };
  
  const startResponse = http.post(`${BASE_URL}/ussd/session/start`, JSON.stringify(startPayload), { headers });
  
  const startSuccess = check(startResponse, {
    'Start session status is 200': (r) => r.status === 200,
    'Start session has message': (r) => r.json('message') !== undefined,
    'Start session response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!startSuccess) {
    errorRate.add(1);
    return;
  }
  
  sleep(1); // Think time
  
  // Step 2: Select menu option 1
  const continuePayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    text: '1'
  };
  
  const continueResponse = http.post(`${BASE_URL}/ussd/session/continue`, JSON.stringify(continuePayload), { headers });
  
  const continueSuccess = check(continueResponse, {
    'Continue session status is 200': (r) => r.status === 200,
    'Continue session response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!continueSuccess) {
    errorRate.add(1);
    return;
  }
  
  sleep(2); // Think time
  
  // Step 3: End session
  const endPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    text: '0'
  };
  
  const endResponse = http.post(`${BASE_URL}/ussd/session/end`, JSON.stringify(endPayload), { headers });
  
  const endSuccess = check(endResponse, {
    'End session status is 200': (r) => r.status === 200,
    'End session response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!endSuccess) {
    errorRate.add(1);
  }
}

// Menu navigation test
function menuNavigationTest(phoneNumber, sessionId, ussdCode) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Start session
  const startPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    ussdCode: ussdCode,
    text: ''
  };
  
  const startResponse = http.post(`${BASE_URL}/ussd/session/start`, JSON.stringify(startPayload), { headers });
  
  if (!check(startResponse, { 'Menu nav start status is 200': (r) => r.status === 200 })) {
    errorRate.add(1);
    return;
  }
  
  // Navigate through multiple menu options
  for (let i = 0; i < 3; i++) {
    sleep(1);
    
    const option = Math.floor(Math.random() * 3) + 1; // Random option 1-3
    const navPayload = {
      sessionId: sessionId,
      phoneNumber: phoneNumber,
      text: option.toString()
    };
    
    const navResponse = http.post(`${BASE_URL}/ussd/session/continue`, JSON.stringify(navPayload), { headers });
    
    if (!check(navResponse, { [`Menu nav step ${i+1} status is 200`]: (r) => r.status === 200 })) {
      errorRate.add(1);
      break;
    }
  }
  
  // End session
  const endPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    text: '0'
  };
  
  http.post(`${BASE_URL}/ussd/session/end`, JSON.stringify(endPayload), { headers });
}

// Error scenarios test
function errorScenariosTest(phoneNumber, sessionId, ussdCode) {
  const headers = { 'Content-Type': 'application/json' };
  
  // Start session
  const startPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    ussdCode: ussdCode,
    text: ''
  };
  
  const startResponse = http.post(`${BASE_URL}/ussd/session/start`, JSON.stringify(startPayload), { headers });
  
  if (!check(startResponse, { 'Error test start status is 200': (r) => r.status === 200 })) {
    errorRate.add(1);
    return;
  }
  
  sleep(1);
  
  // Send invalid menu option
  const invalidPayload = {
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    text: '99' // Invalid option
  };
  
  const invalidResponse = http.post(`${BASE_URL}/ussd/session/continue`, JSON.stringify(invalidPayload), { headers });
  
  check(invalidResponse, {
    'Invalid option handled properly': (r) => r.status === 200 || r.status === 400,
  });
  
  sleep(1);
  
  // Try to continue with invalid session
  const invalidSessionPayload = {
    sessionId: 'invalid-session-id',
    phoneNumber: phoneNumber,
    text: '1'
  };
  
  const invalidSessionResponse = http.post(`${BASE_URL}/ussd/session/continue`, JSON.stringify(invalidSessionPayload), { headers });
  
  check(invalidSessionResponse, {
    'Invalid session handled properly': (r) => r.status === 400 || r.status === 404,
  });
}
