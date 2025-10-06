/**
 * Enhanced K6 USSD Flow Test Generator for New Canvas Graph Structure
 * Generates K6 load testing scripts based on new canvas graph with nodes/edges
 */
class K6GraphTestGenerator {
  constructor(graphData, config = {}) {
    this.graphData = graphData; // Expected: { nodes: [], edges: [], timestamp: "" }
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:9401',
      endpoint: config.endpoint || '/MenuManagement/RequestReceiver',
      login: config.login || 'Ussd_Bearer1',
      password: config.password || 'test',
      phonePrefix: config.phonePrefix || '777',
      sessionIdPrefix: config.sessionIdPrefix || '99',
      loadProfile: config.loadProfile || 'moderate',
      ...config
    };
    
    // Dynamic menu configuration
    this.dynamicMenus = config.dynamicMenus || {};
    
    this.scenarios = [];
    this.startNodes = [];
    this.endNodes = [];
    this.paths = [];
    this.parseGraph();
  }

  parseGraph() {
    if (!this.graphData || !this.graphData.nodes || !this.graphData.edges) {
      throw new Error('Invalid graph data structure. Expected: { nodes: [], edges: [] }');
    }

    console.log('📊 Parsing Canvas Graph Structure...');
    console.log(`Found ${this.graphData.nodes.length} nodes and ${this.graphData.edges.length} edges`);

    // Find START and END nodes (handle both canvas lowercase and uppercase types)
    this.startNodes = this.graphData.nodes.filter(node => {
      const nodeType = this.getNodeType(node);
      return nodeType === 'START';
    });
    
    this.endNodes = this.graphData.nodes.filter(node => {
      const nodeType = this.getNodeType(node);
      return nodeType === 'END';
    });

    console.log(`📍 Found ${this.startNodes.length} START nodes and ${this.endNodes.length} END nodes`);

    // Generate all possible paths from START to END
    this.generateAllPaths();
  }

  generateAllPaths() {
    console.log('🔍 Generating all possible flow paths...');
    
    this.startNodes.forEach(startNode => {
      const paths = this.findPathsFromStart(startNode);
      console.log(`🛤️ Found ${paths.length} paths from START node ${startNode.id}`);
      
      paths.forEach((path, pathIndex) => {
        const scenario = this.createScenarioFromPath(startNode, path, pathIndex);
        this.scenarios.push(scenario);
      });
    });

    console.log(`✅ Generated ${this.scenarios.length} total test scenarios`);
  }

  findPathsFromStart(startNode) {
    const allPaths = [];
    const maxDepth = 20; // Prevent infinite loops
    
    const traverseForward = (currentNode, currentPath, visited = new Set()) => {
      if (visited.has(currentNode.id) || currentPath.length > maxDepth) {
        return;
      }

      const newPath = [...currentPath, currentNode];
      const newVisited = new Set(visited);
      newVisited.add(currentNode.id);

      // If this is an END node, complete the path
      if (this.isEndNode(currentNode)) {
        allPaths.push(newPath);
        return;
      }

      // Find all outgoing edges from current node
      const outgoingEdges = this.graphData.edges.filter(edge => edge.source === currentNode.id);
      
      if (outgoingEdges.length === 0) {
        // Dead end - still add as a path
        allPaths.push(newPath);
        return;
      }

      // Follow each outgoing edge
      outgoingEdges.forEach(edge => {
        const nextNode = this.graphData.nodes.find(n => n.id === edge.target);
        if (nextNode) {
          traverseForward(nextNode, newPath, newVisited);
        }
      });
    };

    traverseForward(startNode, []);
    return allPaths;
  }

  createScenarioFromPath(startNode, path, pathIndex) {
    const scenario = {
      name: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
      startNode: startNode,
      path: path,
      steps: [],
      assertions: []
    };

    console.log(`🔧 Creating scenario: ${scenario.name}`);
    console.log(`📋 Path length: ${path.length} nodes`);
    console.log(`📋 Path: ${path.map(n => `${n.id}(${this.getNodeType(n)})`).join(' → ')}`);

    // Extract steps and assertions from the path
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i];
      const nextNode = path[i + 1];
      
      console.log(`🔧 Processing step ${i}: ${currentNode.id}(${this.getNodeType(currentNode)}) → ${nextNode.id}(${this.getNodeType(nextNode)})`);
      
      // Find the edge between current and next node
      const edge = this.graphData.edges.find(e => 
        e.source === currentNode.id && e.target === nextNode.id
      );

      const step = this.createStepFromNodes(currentNode, nextNode, edge, i);
      scenario.steps.push(step);

      // Create assertion for the next node's expected response
      // Skip ACTION nodes as they are internal API calls
      const assertion = this.createAssertionFromNode(nextNode, edge);
      if (assertion !== null) {
        console.log(`✅ Added assertion for ${nextNode.id}: ${assertion.assertionType} - "${assertion.expectedResponse}"`);
        scenario.assertions.push(assertion);
      } else {
        console.log(`⏭️ Skipped assertion for ${nextNode.id} (ACTION node)`);
      }
    }

    console.log(`📊 Final scenario: ${scenario.steps.length} steps, ${scenario.assertions.length} assertions`);
    
    return scenario;
  }

  createStepFromNodes(currentNode, nextNode, edge, stepIndex) {
    const nodeType = this.getNodeType(currentNode);
    const nextNodeType = this.getNodeType(nextNode);
    
    let userInput = '';
    let storeAttribute = null;

    // Extract user input based on node types and edge
    if (nodeType === 'START') {
      // START node - use ussdCode or first transition
      userInput = this.getStartNodeInput(currentNode);
    } else if (nodeType === 'MENU') {
      // MENU node - use option number from edge
      userInput = this.getMenuSelection(currentNode, edge);
    } else if (nodeType === 'INPUT') {
      // INPUT node - use * for dynamic input or specific value
      userInput = this.getInputValue(currentNode, nextNode);
      storeAttribute = this.getStoreAttribute(currentNode);
    } else if (nodeType === 'DYNAMIC-MENU') {
      // Dynamic menu - use dynamic-output
      userInput = this.getDynamicMenuSelection(currentNode, edge);
    } else if (nodeType === 'ACTION') {
      // ACTION nodes typically don't require user input - they process automatically
      userInput = ''; // No user input required
    }

    return {
      stepIndex: stepIndex,
      nodeId: currentNode.id,
      nodeType: nodeType,
      nextNodeId: nextNode.id,
      nextNodeType: nextNodeType,
      userInput: userInput,
      storeAttribute: storeAttribute,
      edge: edge,
      isActionNode: nextNodeType === 'ACTION',
      templateId: nextNodeType === 'ACTION' ? this.getTemplateId(nextNode) : null
    };
  }

  createAssertionFromNode(node, edge) {
    const nodeType = this.getNodeType(node);
    
    // ACTION nodes are internal API calls - skip assertions for them
    if (nodeType === 'ACTION') {
      return null;
    }
    
    let expectedResponse = '';
    let assertionType = 'content';

    console.log(`🔧 Creating assertion for node ${node.id} (${nodeType})`);

    switch (nodeType) {
      case 'INPUT':
        expectedResponse = this.getInputPrompt(node);
        assertionType = 'input';
        console.log(`📝 INPUT assertion: "${expectedResponse}"`);
        break;
      case 'MENU':
        expectedResponse = this.getMenuPrompt(node);
        assertionType = 'menu';
        console.log(`📝 MENU assertion: "${expectedResponse}"`);
        break;
      case 'DYNAMIC-MENU':
        expectedResponse = this.getDynamicMenuPrompt(node);
        assertionType = 'dynamic_menu';
        console.log(`📝 DYNAMIC-MENU assertion: "${expectedResponse}"`);
        break;
      case 'END':
        expectedResponse = this.getEndPrompt(node);
        assertionType = 'completion';
        console.log(`📝 END assertion: "${expectedResponse}"`);
        break;
      default:
        expectedResponse = 'Please proceed';
        assertionType = 'generic';
        console.log(`📝 GENERIC assertion: "${expectedResponse}"`);
    }

    return {
      nodeId: node.id,
      nodeType: nodeType,
      expectedResponse: expectedResponse,
      assertionType: assertionType,
      isStrictMatch: nodeType === 'END', // END nodes should match exactly
      isDynamicContent: nodeType === 'DYNAMIC-MENU'
    };
  }

  // Helper methods to extract data from new graph structure

  getNodeType(node) {
    // Handle both lowercase (canvas) and uppercase (exported flow) types
    const type = node.type || (node.data && node.data.type) || 'UNKNOWN';
    return type.toUpperCase(); // Normalize to uppercase for consistency
  }

  isEndNode(node) {
    const nodeType = this.getNodeType(node);
    return nodeType === 'END';
  }

  getStartNodeInput(startNode) {
    // Get ussdCode from START node config
    if (startNode.data && startNode.data.config && startNode.data.config.ussdCode) {
      return startNode.data.config.ussdCode;
    }
    
    // Fallback to first transition key
    if (startNode.data && startNode.data.config && startNode.data.config.transitions) {
      const firstKey = Object.keys(startNode.data.config.transitions)[0];
      return firstKey || '123';
    }
    
    return '123'; // Default USSD code
  }

  getMenuSelection(menuNode, edge) {
    // Extract option number from edge label or sourceHandle
    if (edge.sourceHandle && edge.sourceHandle.includes('option-')) {
      return edge.sourceHandle.replace('option-', '');
    }
    
    if (edge.label && edge.label.includes('Option ')) {
      return edge.label.replace('📋 Option ', '').trim();
    }
    
    // Fallback - try to find from transitions
    if (menuNode.data && menuNode.data.config && menuNode.data.config.transitions) {
      const transitions = menuNode.data.config.transitions;
      for (const [key, targetId] of Object.entries(transitions)) {
        if (targetId === edge.target) {
          return key;
        }
      }
    }
    
    return '1'; // Default to option 1
  }

  getInputValue(inputNode, nextNode) {
    // For INPUT nodes, usually return '*' for dynamic input
    // unless there's a specific pattern defined
    if (inputNode.data && inputNode.data.config && inputNode.data.config.matchPattern) {
      return inputNode.data.config.matchPattern;
    }
    return '*'; // Dynamic input
  }

  getStoreAttribute(inputNode) {
    if (inputNode.data && inputNode.data.config) {
      return inputNode.data.config.variableName || inputNode.data.config.storeAttribute || null;
    }
    return null;
  }

  getDynamicMenuSelection(dynamicMenuNode, edge) {
    // Dynamic menus typically use index-based selection
    return '*'; // Will be replaced with actual selection during test
  }

  getTemplateId(actionNode) {
    if (actionNode.data && actionNode.data.config && actionNode.data.config.templates) {
      const templates = actionNode.data.config.templates;
      if (templates.length > 0) {
        return templates[0]._id || templates[0].templateId;
      }
    }
    return null;
  }

  // Prompt extraction methods

  getInputPrompt(inputNode) {
    if (inputNode.data && inputNode.data.config && inputNode.data.config.prompts) {
      return inputNode.data.config.prompts.en || inputNode.data.config.prompts.default || '';
    }
    return 'Please enter your input:';
  }

  getMenuPrompt(menuNode) {
    if (menuNode.data && menuNode.data.config && menuNode.data.config.prompts) {
      return menuNode.data.config.prompts.en || menuNode.data.config.prompts.default || '';
    }
    return 'Please select an option:';
  }

  getDynamicMenuPrompt(dynamicMenuNode) {
    // Check if custom dynamic menu content is configured
    if (this.dynamicMenus[dynamicMenuNode.id] && this.dynamicMenus[dynamicMenuNode.id].menuContent) {
      const customContent = this.dynamicMenus[dynamicMenuNode.id].menuContent.trim();
      if (customContent) {
        return customContent;
      }
    }
    
    // Check node configuration for prompts
    if (dynamicMenuNode.data && dynamicMenuNode.data.config && dynamicMenuNode.data.config.prompts) {
      return dynamicMenuNode.data.config.prompts.en || dynamicMenuNode.data.config.prompts.default || '';
    }
    
    // Default fallback for dynamic menus
    return 'Please select an option:';
  }

  getEndPrompt(endNode) {
    if (endNode.data && endNode.data.config && endNode.data.config.prompts) {
      return endNode.data.config.prompts.en || endNode.data.config.prompts.default || '';
    }
    return 'Thank you for using our service!';
  }

  getActionSuccessResponse(actionNode) {
    // For ACTION nodes, we need to check what the successful response would be
    // This depends on the next node after successful action processing
    if (actionNode.data && actionNode.data.config && actionNode.data.config.transitions) {
      // Look for 200 response or condition-based responses
      const successTransitions = actionNode.data.config.transitions;
      
      // Check for response-200-condition1 pattern
      for (const [key, value] of Object.entries(successTransitions)) {
        if (key.includes('response-200') || key === '200') {
          // This would lead to the next node - we'd need to get that node's prompt
          return ''; // Will be resolved during path traversal
        }
      }
    }
    return ''; // ACTION nodes typically don't return direct prompts
  }

  generateK6Script() {
    if (this.scenarios.length === 0) {
      throw new Error('No scenarios found. Please ensure your flow has START and END nodes connected.');
    }

    const loadStages = this.generateLoadStages();
    const scenariosForScript = this.scenarios.map(scenario => ({
      name: scenario.name,
      startInput: scenario.steps[0]?.userInput || '123',
      steps: scenario.steps.map(step => ({
        input: step.userInput,
        storeAttribute: step.storeAttribute,
        nodeType: step.nodeType,
        nextNodeType: step.nextNodeType,
        isActionNode: step.isActionNode,
        templateId: step.templateId
      })),
      assertions: scenario.assertions
        .filter(assertion => assertion !== null) // Filter out null assertions from ACTION nodes
        .map(assertion => ({
          expectedResponse: assertion.expectedResponse,
          nodeType: assertion.nodeType,
          assertionType: assertion.assertionType,
          isStrictMatch: assertion.isStrictMatch,
          isDynamicContent: assertion.isDynamicContent
        }))
    }));

    return this.generateK6ScriptContent(scenariosForScript, loadStages);
  }

  generateLoadStages() {
    const profiles = {
      light: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 }
      ],
      moderate: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      heavy: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 }
      ],
      stress: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 300 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 0 }
      ]
    };
    
    return profiles[this.config.loadProfile] || profiles.moderate;
  }

  generateK6ScriptContent(scenarios, loadStages) {
    return `import http from 'k6/http';
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
  stages: ${JSON.stringify(loadStages, null, 4)},
  
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
    version: '${new Date().toISOString().split('T')[0]}'
  }
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

// Flow scenarios generated from canvas graph
const FLOW_SCENARIOS = ${JSON.stringify(scenarios, null, 2)};

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
  const optionRegex = /\\d+\\.\\s*([^\\n\\r]+)/g;
  let match;
  
  while ((match = optionRegex.exec(body)) !== null) {
    const optionNumber = match[0].charAt(0);
    const optionText = match[1].trim();
    menuOptions.push({
      number: optionNumber,
      text: optionText
    });
  }
  
  console.log(\`📋 Extracted \${menuOptions.length} menu options:\`, menuOptions);
  return menuOptions;
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
  
  console.log(\`[\${new Date().toISOString()}] \${input} -> \${response.status} (\${duration}ms)\`);
  
  return { response, duration };
}

function validateResponse(response, assertion, stepIndex, scenarioName) {
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    assertion_type: assertion.assertionType,
    is_dynamic: assertion.isDynamicContent
  };
  
  // Enhanced logging - show what we're comparing
  console.log(\`🔍 Step \${stepIndex} Validation (\${assertion.nodeType}):\`);
  console.log(\`📥 ACTUAL RESPONSE: "\${response.body ? response.body.trim() : 'NO BODY'}"\`);
  console.log(\`📋 EXPECTED: "\${assertion.expectedResponse}"\`);
  console.log(\`📊 Status: \${response.status}, Duration: \${response.timings.duration}ms\`);
  
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
        
        console.log(\`🔍 Dynamic Menu Check: Found \${menuOptions.length} menu options\`);
        
        if (hasMenuStructure) {
          dynamicMenuHandling.add(1, tags);
          console.log(\`✅ Dynamic menu validation: PASSED\`);
        } else {
          dynamicMenuHandling.add(0, tags);
          console.log(\`❌ Dynamic menu validation: FAILED - No menu structure found\`);
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
          console.log(\`🔍 END Node Dynamic Content Validation:\`);
          console.log(\`  Expected template: "\${assertion.expectedResponse}"\`);
          console.log(\`  Actual response: "\${r.body}"\`);
          
          // Extract static parts by removing dynamic placeholders
          const staticParts = expectedText
            .split(/:[a-zA-Z_][a-zA-Z0-9_]*/)  // Split on :variableName patterns
            .filter(part => part.trim().length > 3)  // Only keep meaningful parts (not just "with", etc.)
            .map(part => part.trim());
          
          console.log(\`  Static parts to find: [\${staticParts.join(', ')}]\`);
          
          // Check if key static parts are present in the response
          const keyPartsFound = staticParts.filter(part => 
            actualBody.includes(part)
          );
          
          console.log(\`  Parts found: [\${keyPartsFound.join(', ')}]\`);
          
          // Success if most key parts are found (flexible matching)
          const matchPercentage = staticParts.length > 0 ? (keyPartsFound.length / staticParts.length) : 0;
          
          if (matchPercentage >= 0.7 && keyPartsFound.length > 0) { // 70% match threshold
            console.log(\`✅ END node validation: Found \${keyPartsFound.length}/\${staticParts.length} key parts (\${Math.round(matchPercentage * 100)}%) - PASSED\`);
            return true;
          }
          
          // Fallback: check for key success indicators
          const successKeywords = ['thank', 'success', 'complete', 'transaction'];
          const foundSuccessKeywords = successKeywords.filter(keyword => actualBody.includes(keyword));
          const hasSuccessIndicator = foundSuccessKeywords.length > 0;
          
          if (hasSuccessIndicator) {
            console.log(\`✅ END node validation: Found success indicators [\${foundSuccessKeywords.join(', ')}] - PASSED\`);
            return true;
          }
          
          console.log(\`❌ END node validation: Only found \${keyPartsFound.length}/\${staticParts.length} key parts (\${Math.round(matchPercentage * 100)}%) - FAILED\`);
          return false;
        }
        
        // For non-END nodes, use standard strict matching
        return actualBody.includes(expectedText) || expectedText.includes(actualBody);
      };
    } else {
      // Flexible content matching with detailed logging
      checks['content contains expected'] = (r) => {
        const bodyLower = r.body.toLowerCase();
        const expectedLower = assertion.expectedResponse.toLowerCase();
        
        console.log(\`🔍 Content Matching Check:\`);
        console.log(\`  Body (lowercase): "\${bodyLower}"\`);
        console.log(\`  Expected (lowercase): "\${expectedLower}"\`);
        
        // For menu responses, check for menu structure
        if (assertion.assertionType === 'menu' || assertion.assertionType === 'menu_options') {
          const hasMenuNumbers = /\\d+\\./.test(r.body);
          const containsExpected = bodyLower.includes(expectedLower);
          const result = hasMenuNumbers || containsExpected;
          
          console.log(\`  Menu numbers found: \${hasMenuNumbers}\`);
          console.log(\`  Contains expected text: \${containsExpected}\`);
          console.log(\`  MENU validation result: \${result ? 'PASSED' : 'FAILED'}\`);
          
          return result;
        }
        
        // For input prompts, check for key phrases
        if (assertion.assertionType === 'input' || assertion.assertionType === 'input_prompt') {
          const inputKeywords = ['enter', 'input', 'provide', 'type'];
          const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
          const containsExpected = bodyLower.includes(expectedLower);
          const result = hasInputKeyword || containsExpected;
          
          console.log(\`  Input keywords found: \${hasInputKeyword}\`);
          console.log(\`  Contains expected text: \${containsExpected}\`);
          console.log(\`  INPUT validation result: \${result ? 'PASSED' : 'FAILED'}\`);
          
          return result;
        }
        
        // For dynamic menu responses
        if (assertion.assertionType === 'dynamic-menu') {
          const hasMenuNumbers = /\\d+\\./.test(r.body);
          const containsExpected = bodyLower.includes(expectedLower);
          const result = hasMenuNumbers || containsExpected;
          
          console.log(\`  Dynamic menu numbers found: \${hasMenuNumbers}\`);
          console.log(\`  Contains expected text: \${containsExpected}\`);
          console.log(\`  DYNAMIC-MENU validation result: \${result ? 'PASSED' : 'FAILED'}\`);
          
          return result;
        }
        
        // For END nodes - simple content matching
        if (assertion.assertionType === 'end') {
          const containsExpected = bodyLower.includes(expectedLower);
          const hasCompletionWords = ['thank', 'success', 'complete', 'transaction'].some(word => bodyLower.includes(word));
          const result = containsExpected || hasCompletionWords;
          
          console.log(\`  Contains expected text: \${containsExpected}\`);
          console.log(\`  Has completion words: \${hasCompletionWords}\`);
          console.log(\`  END validation result: \${result ? 'PASSED' : 'FAILED'}\`);
          
          return result;
        }
        
        // General content matching
        const result = bodyLower.includes(expectedLower) || expectedLower.includes(bodyLower);
        console.log(\`  General content match: \${result ? 'PASSED' : 'FAILED'}\`);
        return result;
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
  
  console.log(\`🚀 Starting scenario: \${scenario.name} for \${phoneNumber}\`);
  
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
        console.log(\`🔄 Dynamic input: \${step.storeAttribute} -> \${processedInput}\`);
      } else if (step.input === '*' && step.nextNodeType === 'DYNAMIC-MENU' && currentMenuOptions.length > 0) {
        // For dynamic menus, select from available options
        const randomOption = currentMenuOptions[Math.floor(Math.random() * currentMenuOptions.length)];
        processedInput = randomOption.number;
        console.log(\`🔄 Dynamic menu selection: Option \${processedInput} -> \${randomOption.text}\`);
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
          console.log(\`❌ Step \${i + 1} failed validation\`);
          break;
        }
      }
      
      // Check if this is the last step
      if (i === scenario.steps.length - 1) {
        flowCompleted = true;
        console.log(\`✅ Flow completed successfully for \${phoneNumber}\`);
      }
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
  } catch (error) {
    console.error(\`Error in scenario \${scenario.name}:\`, error.message);
    errorRate.add(1, sessionTags);
    flowCompletionRate.add(0, sessionTags);
  }
  
  sleep(2 + Math.random() * 3);
}

export function setup() {
  console.log('🚀 Canvas Graph USSD Load Test Started');
  console.log(\`Target: \${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`);
  console.log(\`Scenarios: \${FLOW_SCENARIOS.length}\`);
  console.log(\`Load Profile: ${this.config.loadProfile}\`);
  
  return {
    timestamp: new Date().toISOString(),
    scenarios: FLOW_SCENARIOS.length
  };
}

export function teardown(data) {
  console.log('📊 Canvas Graph Load Test Completed');
  console.log(\`Started at: \${data.timestamp}\`);
  console.log(\`Scenarios tested: \${data.scenarios}\`);
}`;
  }

  // Analysis methods
  getFlowAnalysis() {
    return {
      totalNodes: this.graphData.nodes.length,
      totalEdges: this.graphData.edges.length,
      startNodes: this.startNodes.length,
      endNodes: this.endNodes.length,
      totalScenarios: this.scenarios.length,
      nodeTypes: [...new Set(this.graphData.nodes.map(n => this.getNodeType(n)))],
      averagePathLength: this.scenarios.length > 0 
        ? this.scenarios.reduce((sum, s) => sum + s.steps.length, 0) / this.scenarios.length 
        : 0,
      dynamicMenuNodes: this.graphData.nodes.filter(n => this.getNodeType(n) === 'DYNAMIC-MENU').length,
      actionNodes: this.graphData.nodes.filter(n => this.getNodeType(n) === 'ACTION').length
    };
  }

  generateTestCases() {
    return this.scenarios.map((scenario, index) => ({
      id: index + 1,
      name: scenario.name,
      description: this.createTestCaseDescription(scenario),
      steps: scenario.steps.map((step, stepIndex) => ({
        stepNumber: stepIndex + 1,
        action: this.getStepDescription(step),
        expectedResult: scenario.assertions[stepIndex + 1]?.expectedResponse || 'Continue to next step',
        input: step.userInput,
        nodeType: step.nodeType
      }))
    }));
  }

  createTestCaseDescription(scenario) {
    const pathDescription = scenario.steps.map(step => {
      if (step.storeAttribute && step.userInput === '*') {
        return `${step.nodeType}(${step.storeAttribute})`;
      }
      return `${step.nodeType}(${step.userInput})`;
    }).join(' → ');
    
    return `Flow path: START → ${pathDescription} → END`;
  }

  getStepDescription(step) {
    switch (step.nodeType) {
      case 'START':
        return `Dial USSD code: ${step.userInput}`;
      case 'MENU':
        return `Select menu option: ${step.userInput}`;
      case 'INPUT':
        if (step.storeAttribute) {
          return `Enter ${step.storeAttribute}: ${step.userInput === '*' ? 'dynamic value' : step.userInput}`;
        }
        return `Enter input: ${step.userInput}`;
      case 'DYNAMIC-MENU':
        return `Select from dynamic menu: ${step.userInput}`;
      case 'ACTION':
        return `Process action: ${step.templateId || 'API call'}`;
      default:
        return `Navigate from ${step.nodeType} with input: ${step.userInput}`;
    }
  }
}

module.exports = K6GraphTestGenerator;