import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for enhanced monitoring
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const assertionSuccessRate = new Rate('assertion_success');
const dynamicMenuHandling = new Rate('dynamic_menu_success');

// Test configuration
export const options = {
  stages: [
    {
        "duration": "1m",
        "target": 20
    },
    {
        "duration": "3m",
        "target": 20
    },
    {
        "duration": "1m",
        "target": 50
    },
    {
        "duration": "2m",
        "target": 50
    },
    {
        "duration": "1m",
        "target": 0
    }
],
  
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.05'],
    flow_completion: ['rate>0.9'],
    step_failures: ['rate<0.05'],
    assertion_success: ['rate>0.95'],
    dynamic_menu_success: ['rate>0.9']
  },

  tags: {
    testType: 'ussd_canvas_flow_test',
    generator: 'k6-graph-generator',
    version: '2025-10-01'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: 'https://ussd-gateway.example.com',
  ENDPOINT: '/MenuManagement/RequestReceiver',
  LOGIN: 'Ussd_Bearer1',
  PASSWORD: 'test',
  PHONE_PREFIX: '777',
  SESSION_ID_PREFIX: '99',
};

// Flow scenarios generated from canvas graph
const FLOW_SCENARIOS = [
  {
    "name": "Flow_start_banking_Path_1",
    "startInput": "*123#",
    "steps": [
      {
        "input": "*123#",
        "storeAttribute": null,
        "nodeType": "START",
        "nextNodeType": "INPUT",
        "isActionNode": false,
        "templateId": null
      },
      {
        "input": "*",
        "storeAttribute": "USERPIN",
        "nodeType": "INPUT",
        "nextNodeType": "ACTION",
        "isActionNode": true,
        "templateId": null
      },
      {
        "input": "",
        "storeAttribute": null,
        "nodeType": "ACTION",
        "nextNodeType": "MENU",
        "isActionNode": false,
        "templateId": null
      },
      {
        "input": "2",
        "storeAttribute": null,
        "nodeType": "MENU",
        "nextNodeType": "ACTION",
        "isActionNode": true,
        "templateId": null
      },
      {
        "input": "",
        "storeAttribute": null,
        "nodeType": "ACTION",
        "nextNodeType": "DYNAMIC-MENU",
        "isActionNode": false,
        "templateId": null
      },
      {
        "input": "*",
        "storeAttribute": null,
        "nodeType": "DYNAMIC-MENU",
        "nextNodeType": "INPUT",
        "isActionNode": false,
        "templateId": null
      },
      {
        "input": "*",
        "storeAttribute": "AMOUNT",
        "nodeType": "INPUT",
        "nextNodeType": "ACTION",
        "isActionNode": true,
        "templateId": null
      },
      {
        "input": "",
        "storeAttribute": null,
        "nodeType": "ACTION",
        "nextNodeType": "END",
        "isActionNode": false,
        "templateId": null
      }
    ],
    "assertions": [
      {
        "expectedResponse": "Enter your 4-digit PIN:",
        "nodeType": "INPUT",
        "assertionType": "input_prompt",
        "isStrictMatch": false,
        "isDynamicContent": false
      },
      {
        "expectedResponse": "Main Menu:\n1. Send Money\n2. Pay Bills\n3. Check Balance",
        "nodeType": "MENU",
        "assertionType": "menu_options",
        "isStrictMatch": false,
        "isDynamicContent": false
      },
      {
        "expectedResponse": "1.Electricity Board - KSEB\n2.Water Authority - KWA\n3.Mobile Recharge - All Networks\n4.Gas Pipeline - IOC\n5.Cable TV - Asianet\n6.Internet - BSNL Broadband",
        "nodeType": "DYNAMIC-MENU",
        "assertionType": "dynamic_menu",
        "isStrictMatch": false,
        "isDynamicContent": true
      },
      {
        "expectedResponse": "Enter amount to pay:",
        "nodeType": "INPUT",
        "assertionType": "input_prompt",
        "isStrictMatch": false,
        "isDynamicContent": false
      },
      {
        "expectedResponse": "Payment successful! Ref: ${transactionId}",
        "nodeType": "END",
        "assertionType": "completion",
        "isStrictMatch": true,
        "isDynamicContent": false
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

// Generate dynamic values based on storeAttribute
function generateDynamicValue(storeAttribute) {
  if (!storeAttribute) return 'DEFAULT_VALUE';
  
  const attr = storeAttribute.toUpperCase();
  
  switch (true) {
    case attr.includes('PIN') || attr.includes('PASSWORD'):
      return ['1234', '5678', '1111', '0000', '9999'][Math.floor(Math.random() * 5)];
    
    case attr.includes('AMOUNT') || attr.includes('MONEY') || attr.includes('BALANCE'):
      return [10, 25, 50, 100, 200, 500, 1000, 2000, 5000][Math.floor(Math.random() * 9)].toString();
    
    case attr.includes('PHONE') || attr.includes('MSISDN') || attr.includes('MOBILE'):
      const prefixes = ['777', '778', '779', '770'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      return prefix + suffix;
    
    case attr.includes('ACCOUNT') || attr.includes('ACC'):
      return Math.floor(100000000 + Math.random() * 900000000).toString();
    
    case attr.includes('NAME') || attr.includes('BENEFICIARY'):
      return ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson'][Math.floor(Math.random() * 4)];
    
    case attr.includes('REFERENCE') || attr.includes('REF') || attr.includes('CODE'):
      return 'REF' + Math.floor(100000 + Math.random() * 900000);
    
    default:
      return 'DEFAULT_VALUE';
  }
}

// Process dynamic menu responses
function processDynamicMenuResponse(response) {
  if (!response || !response.body) return [];
  
  const body = response.body;
  const menuOptions = [];
  
  // Extract numbered options (1. Option, 2. Option, etc.)
  const optionRegex = /\d+\.\s*([^\n\r]+)/g;
  let match;
  
  while ((match = optionRegex.exec(body)) !== null) {
    const optionNumber = match[0].charAt(0);
    const optionText = match[1].trim();
    menuOptions.push({
      number: optionNumber,
      text: optionText
    });
  }
  
  console.log(`📋 Extracted ${menuOptions.length} menu options:`, menuOptions);
  return menuOptions;
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
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    assertion_type: assertion.assertionType,
    is_dynamic: assertion.isDynamicContent
  };
  
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  if (response.body && assertion.expectedResponse) {
    // Enhanced content validation based on assertion type
    if (assertion.assertionType === 'dynamic_menu') {
      checks['dynamic menu content'] = (r) => {
        const menuOptions = processDynamicMenuResponse(r);
        const hasMenuStructure = menuOptions.length > 0;
        
        if (hasMenuStructure) {
          dynamicMenuHandling.add(1, tags);
        } else {
          dynamicMenuHandling.add(0, tags);
        }
        
        return hasMenuStructure;
      };
    } else if (assertion.isStrictMatch) {
      // Enhanced matching for END nodes with dynamic content
      checks['end node content match'] = (r) => {
        const actualBody = r.body.trim().toLowerCase();
        const expectedText = assertion.expectedResponse.trim().toLowerCase();
        
        // Handle dynamic content in END nodes (like transaction IDs)
        if (assertion.nodeType === 'END') {
          // Extract static parts by removing dynamic placeholders
          const staticParts = expectedText
            .split(/:[a-zA-Z_][a-zA-Z0-9_]*/)  // Split on :variableName patterns
            .filter(part => part.trim().length > 3)  // Only keep meaningful parts (not just "with", etc.)
            .map(part => part.trim());
          
          // Check if key static parts are present in the response
          const keyPartsFound = staticParts.filter(part => 
            actualBody.includes(part)
          );
          
          // Success if most key parts are found (flexible matching)
          const matchPercentage = staticParts.length > 0 ? (keyPartsFound.length / staticParts.length) : 0;
          
          if (matchPercentage >= 0.7 && keyPartsFound.length > 0) { // 70% match threshold
            console.log(`✅ END node validation: Found ${keyPartsFound.length}/${staticParts.length} key parts (${Math.round(matchPercentage * 100)}%)`);
            return true;
          }
          
          // Fallback: check for key success indicators
          const successKeywords = ['thank', 'success', 'complete', 'transaction'];
          const hasSuccessIndicator = successKeywords.some(keyword => 
            actualBody.includes(keyword)
          );
          
          if (hasSuccessIndicator) {
            console.log(`✅ END node validation: Found success indicator in response`);
            return true;
          }
          
          console.log(`⚠️ END node validation: Only found ${keyPartsFound.length}/${staticParts.length} key parts (${Math.round(matchPercentage * 100)}%)`);
          return false;
        }
        
        // For non-END nodes, use standard strict matching
        return actualBody.includes(expectedText) || expectedText.includes(actualBody);
      };
    } else {
      // Flexible content matching
      checks['content contains expected'] = (r) => {
        const bodyLower = r.body.toLowerCase();
        const expectedLower = assertion.expectedResponse.toLowerCase();
        
        // For menu responses, check for menu structure
        if (assertion.assertionType === 'menu_options') {
          const hasMenuNumbers = /\d+\./.test(r.body);
          return hasMenuNumbers || bodyLower.includes(expectedLower);
        }
        
        // For input prompts, check for key phrases
        if (assertion.assertionType === 'input_prompt') {
          const inputKeywords = ['enter', 'input', 'provide', 'type'];
          const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
          return hasInputKeyword || bodyLower.includes(expectedLower);
        }
        
        // General content matching
        return bodyLower.includes(expectedLower) || expectedLower.includes(bodyLower);
      };
    }
    
    // Check for error indicators
    const errorKeywords = ['error', 'invalid', 'failed', 'wrong', 'denied'];
    checks['no error indicators'] = (r) => {
      return !errorKeywords.some(keyword => r.body.toLowerCase().includes(keyword));
    };
  }
  
  const result = check(response, checks, tags);
  assertionSuccessRate.add(result ? 1 : 0, tags);
  
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
  let currentMenuOptions = [];
  
  const sessionTags = {
    scenario_name: scenario.name,
    phone_number: phoneNumber.substring(0, 3) + 'XXX'
  };
  
  try {
    // Step 1: Initiate USSD session
    const { response: startResponse } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      scenario.startInput, 
      1
    );
    
    // Validate start response
    if (scenario.assertions.length > 0) {
      const startAssertion = scenario.assertions[0];
      if (!validateResponse(startResponse, startAssertion, 0, scenario.name)) {
        errorRate.add(1, sessionTags);
        stepFailureRate.add(1, { ...sessionTags, step: 0 });
        return;
      }
    }
    
    sleep(1 + Math.random() * 2);
    
    // Step 2: Process each step in the scenario
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const assertion = scenario.assertions[i + 1]; // Next assertion (offset by 1)
      
      let processedInput = step.input;
      
      // Handle dynamic inputs
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
        console.log(`🔄 Dynamic input: ${step.storeAttribute} -> ${processedInput}`);
      } else if (step.input === '*' && step.nextNodeType === 'DYNAMIC-MENU' && currentMenuOptions.length > 0) {
        // For dynamic menus, select from available options
        const randomOption = currentMenuOptions[Math.floor(Math.random() * currentMenuOptions.length)];
        processedInput = randomOption.number;
        console.log(`🔄 Dynamic menu selection: Option ${processedInput} -> ${randomOption.text}`);
      }
      
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      
      // For dynamic menu responses, extract menu options for next step
      if (step.nextNodeType === 'DYNAMIC-MENU') {
        currentMenuOptions = processDynamicMenuResponse(response);
      }
      
      // Validate response if assertion exists
      if (assertion) {
        if (!validateResponse(response, assertion, i + 1, scenario.name)) {
          errorRate.add(1, { ...sessionTags, step: i + 1 });
          stepFailureRate.add(1, { ...sessionTags, step: i + 1 });
          console.log(`❌ Step ${i + 1} failed validation`);
          break;
        }
      }
      
      // Check if this is the last step
      if (i === scenario.steps.length - 1) {
        flowCompleted = true;
        console.log(`✅ Flow completed successfully for ${phoneNumber}`);
      }
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
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
  console.log(`Scenarios: ${FLOW_SCENARIOS.length}`);
  console.log(`Load Profile: moderate`);
  
  return {
    timestamp: new Date().toISOString(),
    scenarios: FLOW_SCENARIOS.length
  };
}

export function teardown(data) {
  console.log('📊 Canvas Graph Load Test Completed');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Scenarios tested: ${data.scenarios}`);
}