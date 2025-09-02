/**
 * Enhanced K6 USSD Flow Test Generator
 * Generates K6 load testing scripts based on exported USSD flow JSON
 */
class K6TestGenerator {
  constructor(flowData, config = {}) {
    this.flowData = flowData;
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:80',
      endpoint: config.endpoint || '/MenuManagement/RequestReceiver',
      login: config.login || 'Ussd_Bearer1',
      password: config.password || 'test',
      phonePrefix: config.phonePrefix || '777',
      sessionIdPrefix: config.sessionIdPrefix || '99',
      loadProfile: config.loadProfile || 'moderate',
      ...config
    };
    
    this.scenarios = [];
    this.startNodes = [];
    this.parseFlow();
  }

  parseFlow() {
    // Find all START nodes
    this.startNodes = this.flowData.nodes.filter(node => node.type === 'START');
    
    // Generate complete flow paths for each START node
    this.startNodes.forEach(startNode => {
      const paths = this.findAllPaths(startNode);
      paths.forEach(path => {
        this.scenarios.push({
          name: `Flow_${startNode.id}_Path_${this.scenarios.length + 1}`,
          startNode,
          path,
          inputs: this.extractInputsFromPath(path)
        });
      });
    });
  }

  findAllPaths(startNode, visited = new Set(), currentPath = []) {
    const paths = [];
    const newPath = [...currentPath, startNode];
    
    if (visited.has(startNode.id)) {
      return [newPath]; // Avoid infinite loops
    }
    
    visited.add(startNode.id);
    
    // If no transitions, this is an end node
    if (!startNode.transitions || Object.keys(startNode.transitions).length === 0) {
      return [newPath];
    }
    
    // Explore each transition
    Object.entries(startNode.transitions).forEach(([input, nextNodeId]) => {
      const nextNode = this.flowData.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        const nodeWithInput = { ...startNode, selectedInput: input };
        const nextPaths = this.findAllPaths(
          nextNode, 
          new Set(visited), 
          [...currentPath, nodeWithInput]
        );
        paths.push(...nextPaths);
      }
    });
    
    return paths.length > 0 ? paths : [newPath];
  }

  extractInputsFromPath(path) {
    return path
      .filter(node => node.selectedInput !== undefined)
      .map(node => ({
        nodeType: node.type,
        input: node.selectedInput,
        nodeId: node.id
      }));
  }

  generateK6Script() {
    const loadProfiles = {
      light: {
        stages: [
          { duration: '30s', target: 5 },
          { duration: '1m', target: 5 },
          { duration: '30s', target: 0 }
        ]
      },
      moderate: {
        stages: [
          { duration: '1m', target: 20 },
          { duration: '3m', target: 20 },
          { duration: '1m', target: 50 },
          { duration: '2m', target: 50 },
          { duration: '1m', target: 0 }
        ]
      },
      heavy: {
        stages: [
          { duration: '2m', target: 50 },
          { duration: '5m', target: 100 },
          { duration: '2m', target: 200 },
          { duration: '3m', target: 200 },
          { duration: '2m', target: 0 }
        ]
      }
    };

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');

// Test configuration
export const options = {
  stages: ${JSON.stringify(loadProfiles[this.config.loadProfile].stages, null, 4)},
  
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    errors: ['rate<0.05'],             // Custom error rate below 5%
    flow_completion: ['rate>0.9'],     // Flow completion rate above 90%
  },
};

// Configuration
const CONFIG = {
  BASE_URL: '${this.config.baseUrl}',
  ENDPOINT: '${this.config.endpoint}',
  LOGIN: '${this.config.login}',
  PASSWORD: '${this.config.password}',
  PHONE_PREFIX: '${this.config.phonePrefix}',
  SESSION_ID_PREFIX: '${this.config.sessionIdPrefix}',
};

// Flow scenarios data
const FLOW_SCENARIOS = ${JSON.stringify(this.scenarios.map(s => ({
  name: s.name,
  startInput: Object.keys(s.startNode.transitions || {})[0] || '',
  inputs: s.inputs.map(i => i.input)
})), null, 2)};

// Utility functions
function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

function makeUSSDRequest(sessionId, msisdn, input, newRequest = 0) {
  const url = \`\${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`;
  const params = {
    LOGIN: CONFIG.LOGIN,
    PASSWORD: CONFIG.PASSWORD,
    SESSION_ID: sessionId,
    MSISDN: msisdn,
    NewRequest: newRequest,
    INPUT: input
  };
  
  const queryString = Object.entries(params)
    .map(([key, value]) => \`\${key}=\${encodeURIComponent(value)}\`)
    .join('&');
  
  const fullUrl = \`\${url}?\${queryString}\`;
  
  const startTime = Date.now();
  const response = http.get(fullUrl);
  const duration = Date.now() - startTime;
  
  // Log request for debugging
  console.log(\`Request: \${input} -> Status: \${response.status} -> Duration: \${duration}ms\`);
  
  return { response, duration };
}

function validateUSSDResponse(response, expectedType = null) {
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  // Add specific validations based on response content
  if (response.body) {
    const body = response.body.toLowerCase();
    
    // Check for common USSD response patterns
    if (body.includes('menu') || body.includes('select') || body.includes('choose')) {
      checks['contains menu content'] = (r) => true;
    }
    
    if (body.includes('balance') || body.includes('account')) {
      checks['contains account info'] = (r) => true;
    }
    
    if (body.includes('thank') || body.includes('success') || body.includes('complete')) {
      checks['contains completion message'] = (r) => true;
    }
    
    // Check for error indicators
    checks['no error indicators'] = (r) => {
      const errorKeywords = ['error', 'invalid', 'failed', 'wrong'];
      return !errorKeywords.some(keyword => r.body.toLowerCase().includes(keyword));
    };
  }
  
  return check(response, checks);
}

// Main test function
export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Randomly select a flow scenario
  const scenario = FLOW_SCENARIOS[Math.floor(Math.random() * FLOW_SCENARIOS.length)];
  
  console.log(\`Starting scenario: \${scenario.name} for phone: \${phoneNumber}\`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  
  try {
    // Step 1: Initiate USSD session with start input
    const { response: startResponse, duration: startDuration } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      scenario.startInput, 
      1 // NewRequest = 1 for new session
    );
    
    const startValid = validateUSSDResponse(startResponse, 'START');
    
    if (!startValid) {
      errorRate.add(1);
      return;
    }
    
    // Think time after start
    sleep(1 + Math.random() * 2);
    
    // Step 2: Process each input in the flow
    for (let i = 0; i < scenario.inputs.length; i++) {
      const input = scenario.inputs[i];
      
      const { response, duration } = makeUSSDRequest(
        sessionId,
        phoneNumber,
        input,
        0 // NewRequest = 0 for continuing session
      );
      
      const valid = validateUSSDResponse(response, 'CONTINUE');
      
      if (!valid) {
        errorRate.add(1);
        console.log(\`Flow failed at step \${i + 1} with input: \${input}\`);
        break;
      }
      
      // Check if this is the last step (END node response)
      if (i === scenario.inputs.length - 1) {
        flowCompleted = true;
        console.log(\`Flow completed successfully for \${phoneNumber}\`);
      }
      
      // Think time between inputs
      sleep(0.5 + Math.random() * 1.5);
    }
    
    // Record flow completion
    flowCompletionRate.add(flowCompleted ? 1 : 0);
    
    // Record session duration
    const sessionEnd = Date.now();
    sessionDuration.add(sessionEnd - sessionStart);
    
  } catch (error) {
    console.error(\`Error in scenario \${scenario.name}:\`, error.message);
    errorRate.add(1);
    flowCompletionRate.add(0);
  }
  
  // Inter-scenario think time
  sleep(2 + Math.random() * 3);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('🚀 Starting USSD Flow Load Test');
  console.log(\`Target: \${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`);
  console.log(\`Scenarios: \${FLOW_SCENARIOS.length}\`);
  console.log(\`Load Profile: ${this.config.loadProfile}\`);
  
  return {
    timestamp: new Date().toISOString(),
    scenarios: FLOW_SCENARIOS.length
  };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('📊 Load Test Completed');
  console.log(\`Started at: \${data.timestamp}\`);
  console.log(\`Scenarios tested: \${data.scenarios}\`);
}

// Handle data for parameterization
export function handleSummary(data) {
  return {
    'ussd-load-test-results.json': JSON.stringify(data, null, 2),
    'ussd-load-test-summary.txt': textSummary(data, { indent: ' ', enableColors: true }),
  };
}`;
  }

  generateConfigurableScript() {
    return {
      script: this.generateK6Script(),
      config: this.config,
      scenarios: this.scenarios.map(s => ({
        name: s.name,
        startNode: s.startNode.id,
        inputs: s.inputs
      })),
      flowAnalysis: {
        totalNodes: this.flowData.nodes.length,
        startNodes: this.startNodes.length,
        totalScenarios: this.scenarios.length,
        nodeTypes: [...new Set(this.flowData.nodes.map(n => n.type))]
      }
    };
  }
}

module.exports = K6TestGenerator;
