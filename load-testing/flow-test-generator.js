const fs = require('fs');
const path = require('path');

/**
 * USSD Flow Test Generator
 * Generates load test scenarios based on exported USSD flow JSON
 */
class FlowTestGenerator {
  constructor(flowJsonPath) {
    this.flowData = JSON.parse(fs.readFileSync(flowJsonPath, 'utf8'));
    this.testScenarios = [];
    this.parseFlow();
  }

  parseFlow() {
    console.log('🔍 Analyzing USSD Flow...');
    
    // Find START nodes
    const startNodes = this.flowData.nodes.filter(node => node.type === 'START');
    console.log(`Found ${startNodes.length} START node(s)`);
    
    // Generate test scenarios for each START node
    startNodes.forEach(startNode => {
      const scenarios = this.generateScenariosFromNode(startNode);
      this.testScenarios.push(...scenarios);
    });
    
    console.log(`Generated ${this.testScenarios.length} test scenario(s)`);
  }

  generateScenariosFromNode(node, path = [], visited = new Set()) {
    if (visited.has(node.id)) {
      return []; // Avoid infinite loops
    }
    
    visited.add(node.id);
    const scenarios = [];
    const currentPath = [...path, node];
    
    // If this node has no transitions, it's an end node
    if (!node.transitions || Object.keys(node.transitions).length === 0) {
      scenarios.push({
        name: `Flow ending at ${node.type}_${node.id}`,
        path: currentPath,
        inputs: this.extractInputsFromPath(currentPath)
      });
      return scenarios;
    }
    
    // Generate scenarios for each transition
    Object.entries(node.transitions).forEach(([input, nextNodeId]) => {
      const nextNode = this.flowData.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        const pathWithInput = currentPath.map((n, i) => 
          i === currentPath.length - 1 ? { ...n, userInput: input } : n
        );
        
        const nextScenarios = this.generateScenariosFromNode(
          nextNode, 
          pathWithInput, 
          new Set(visited)
        );
        scenarios.push(...nextScenarios);
      }
    });
    
    return scenarios;
  }

  extractInputsFromPath(path) {
    return path
      .filter(node => node.userInput !== undefined)
      .map(node => ({
        nodeType: node.type,
        input: node.userInput,
        nodeId: node.id
      }));
  }

  generateJMeterScenario(scenario) {
    const steps = [];
    let stepCounter = 1;
    
    // Start session step
    const startNode = scenario.path[0];
    const ussdCode = Object.keys(startNode.transitions || {})[0] || '*123#';
    
    steps.push(`
        <!-- Step ${stepCounter++}: Initiate USSD Session -->
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${stepCounter-1}. Start ${scenario.name}" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="" elementType="HTTPArgument">
                <stringProp name="Argument.value">{
  "sessionId": "\${session_id}",
  "phoneNumber": "\${phone_number}",
  "ussdCode": "${ussdCode}",
  "text": ""
}</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.path">/ussd/session/start</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>`);
    
    // Add steps for each input
    scenario.inputs.forEach((input, index) => {
      steps.push(`
        <!-- Step ${stepCounter++}: ${input.nodeType} Input -->
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${stepCounter-1}. Input ${input.input}" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="" elementType="HTTPArgument">
                <stringProp name="Argument.value">{
  "sessionId": "\${session_id}",
  "phoneNumber": "\${phone_number}",
  "text": "${input.input}"
}</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.path">/ussd/session/continue</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
        </HTTPSamplerProxy>
        
        <!-- Think time -->
        <UniformRandomTimer guiclass="UniformRandomTimerGui" testclass="UniformRandomTimer" testname="Think Time" enabled="true">
          <stringProp name="ConstantTimer.delay">500</stringProp>
          <stringProp name="RandomTimer.range">1500</stringProp>
        </UniformRandomTimer>`);
    });
    
    return steps.join('\n');
  }

  generateK6Scenario(scenario) {
    const steps = [];
    
    // Start session
    const startNode = scenario.path[0];
    const ussdCode = Object.keys(startNode.transitions || {})[0] || '*123#';
    
    steps.push(`
  // ${scenario.name}
  const startResponse = http.post(\`\${BASE_URL}/ussd/session/start\`, JSON.stringify({
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    ussdCode: '${ussdCode}',
    text: ''
  }), { headers });
  
  check(startResponse, {
    '${scenario.name} start status is 200': (r) => r.status === 200,
  });
  
  sleep(1);`);
    
    // Add steps for each input
    scenario.inputs.forEach((input, index) => {
      steps.push(`
  const step${index + 1}Response = http.post(\`\${BASE_URL}/ussd/session/continue\`, JSON.stringify({
    sessionId: sessionId,
    phoneNumber: phoneNumber,
    text: '${input.input}'
  }), { headers });
  
  check(step${index + 1}Response, {
    '${scenario.name} step ${index + 1} status is 200': (r) => r.status === 200,
  });
  
  sleep(1);`);
    });
    
    return steps.join('\n');
  }

  generateArtilleryScenario(scenario) {
    const steps = [];
    
    // Start session
    const startNode = scenario.path[0];
    const ussdCode = Object.keys(startNode.transitions || {})[0] || '*123#';
    
    steps.push(`
  - name: "${scenario.name}"
    weight: 1
    flow:
      - function: "generatePhoneNumber"
      - function: "generateSessionId"
      
      # Start session
      - post:
          url: "/ussd/session/start"
          json:
            sessionId: "{{ sessionId }}"
            phoneNumber: "{{ phoneNumber }}"
            ussdCode: "${ussdCode}"
            text: ""
          expect:
            - statusCode: 200
      
      - think: 1`);
    
    // Add steps for each input
    scenario.inputs.forEach((input, index) => {
      steps.push(`
      # ${input.nodeType} input: ${input.input}
      - post:
          url: "/ussd/session/continue"
          json:
            sessionId: "{{ sessionId }}"
            phoneNumber: "{{ phoneNumber }}"
            text: "${input.input}"
          expect:
            - statusCode: 200
      
      - think: 1`);
    });
    
    return steps.join('\n');
  }

  generateFlowSpecificTests() {
    console.log('🔧 Generating flow-specific test files...');
    
    // Create output directory
    const outputDir = path.join(__dirname, 'generated-tests');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Generate test summary
    const summary = {
      flowAnalysis: {
        totalNodes: this.flowData.nodes.length,
        nodeTypes: [...new Set(this.flowData.nodes.map(n => n.type))],
        totalScenarios: this.testScenarios.length
      },
      scenarios: this.testScenarios.map(s => ({
        name: s.name,
        steps: s.inputs.length + 1, // +1 for start
        inputs: s.inputs.map(i => `${i.nodeType}: ${i.input}`)
      }))
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'flow-analysis.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Generate K6 test with all scenarios
    const k6Test = `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    flow_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

const BASE_URL = 'http://localhost:8080';

function generatePhoneNumber() {
  return '254700' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  const headers = { 'Content-Type': 'application/json' };
  
  // Randomly choose a scenario
  const scenarios = [${this.testScenarios.map((s, i) => `scenario${i}`).join(', ')}];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario(phoneNumber, sessionId, headers);
}

${this.testScenarios.map((scenario, index) => `
function scenario${index}(phoneNumber, sessionId, headers) {
  ${this.generateK6Scenario(scenario)}
}`).join('\n')}`;
    
    fs.writeFileSync(path.join(outputDir, 'flow-specific-k6.js'), k6Test);
    
    // Generate Artillery config with all scenarios
    const artilleryConfig = `config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 5
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:${this.testScenarios.map(s => this.generateArtilleryScenario(s)).join('')}

processor:
  generatePhoneNumber: |
    function(requestParams, context, next) {
      context.vars.phoneNumber = '254700' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      return next();
    }
  
  generateSessionId: |
    function(requestParams, context, next) {
      context.vars.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      return next();
    }`;
    
    fs.writeFileSync(path.join(outputDir, 'flow-specific-artillery.yml'), artilleryConfig);
    
    console.log(`✅ Generated flow-specific tests in ${outputDir}/`);
    console.log(`📊 Analysis summary saved to flow-analysis.json`);
    
    return summary;
  }
}

// CLI usage
if (require.main === module) {
  const flowPath = process.argv[2];
  
  if (!flowPath) {
    console.log('Usage: node flow-test-generator.js <path-to-flow.json>');
    console.log('Example: node flow-test-generator.js ../exported-flow.json');
    process.exit(1);
  }
  
  if (!fs.existsSync(flowPath)) {
    console.error(`Error: File ${flowPath} not found`);
    process.exit(1);
  }
  
  try {
    const generator = new FlowTestGenerator(flowPath);
    const summary = generator.generateFlowSpecificTests();
    
    console.log('\n📋 Flow Analysis Summary:');
    console.log(`Total Nodes: ${summary.flowAnalysis.totalNodes}`);
    console.log(`Node Types: ${summary.flowAnalysis.nodeTypes.join(', ')}`);
    console.log(`Test Scenarios: ${summary.flowAnalysis.totalScenarios}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = FlowTestGenerator;
