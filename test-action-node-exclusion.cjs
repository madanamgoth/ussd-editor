/**
 * Test K6 Generator - Verify ACTION nodes have no assertions
 * This tests the updated logic to skip ACTION node assertions
 */

const K6GraphTestGenerator = require('./load-testing/k6-graph-generator.js');

// Sample canvas graph with ACTION nodes
const testGraphWithActions = {
  "nodes": [
    {
      "id": "start_test",
      "type": "start",
      "data": {
        "type": "START",
        "config": {
          "ussdCode": "123",
          "prompts": { "en": "Welcome to Banking" }
        }
      }
    },
    {
      "id": "input_pin",
      "type": "input",
      "data": {
        "type": "INPUT",
        "config": {
          "variableName": "USERPIN",
          "prompts": { "en": "Please enter your PIN:" }
        }
      }
    },
    {
      "id": "action_verify",
      "type": "action",
      "data": {
        "type": "ACTION",
        "config": {
          "templates": { "VERIFY_PIN": "/api/verify-pin" }
        }
      }
    },
    {
      "id": "menu_main",
      "type": "menu",
      "data": {
        "type": "MENU",
        "config": {
          "prompts": { "en": "1. Send Money\n2. Check Balance" }
        }
      }
    },
    {
      "id": "action_send",
      "type": "action",
      "data": {
        "type": "ACTION",
        "config": {
          "templates": { "SEND_MONEY": "/api/send-money" }
        }
      }
    },
    {
      "id": "end_success",
      "type": "end",
      "data": {
        "type": "END",
        "config": {
          "prompts": { "en": "Transaction completed successfully!" }
        }
      }
    }
  ],
  "edges": [
    { "source": "start_test", "target": "input_pin" },
    { "source": "input_pin", "target": "action_verify" },
    { "source": "action_verify", "target": "menu_main" },
    { "source": "menu_main", "target": "action_send" },
    { "source": "action_send", "target": "end_success" }
  ],
  "timestamp": "2025-10-02T00:00:00Z"
};

const config = {
  gateway: {
    host: 'localhost',
    port: '8080',
    endpoint: '/MenuManagement/RequestReceiver'
  },
  credentials: {
    login: 'testuser',
    password: 'testpass'
  }
};

console.log('🧪 Testing ACTION Node Assertion Exclusion...');

try {
  // Create generator
  const generator = new K6GraphTestGenerator(testGraphWithActions, config);
  
  // Generate K6 script
  const k6Script = generator.generateK6Script();
  
  console.log('📊 Generator Results:');
  console.log(`- Script length: ${k6Script.length} characters`);
  
  // Check for ACTION assertion patterns in the script (more specific)
  const actionAssertionPatterns = [
    /assertions":\s*\[[\s\S]*?"nodeType":\s*"ACTION"/,  // ACTION in assertions array
    /"assertionType":\s*"action"/,                      // action assertion type
    /assertions"[\s\S]*?expectedResponse":\s*"Please proceed"/  // Generic "Please proceed" in assertions
  ];
  
  console.log('\n🔍 Checking for ACTION node assertions...');
  
  let actionAssertionsFound = 0;
  actionAssertionPatterns.forEach((pattern, index) => {
    const matches = (k6Script.match(pattern) || []).length;
    if (matches > 0) {
      console.log(`❌ Found ACTION assertion pattern ${index + 1}: ${matches} matches`);
      actionAssertionsFound += matches;
    } else {
      console.log(`✅ No ACTION assertion pattern ${index + 1} found`);
    }
  });
  
  // Also check that ACTION nodes exist in steps (this is correct)
  const actionInSteps = (k6Script.match(/"nodeType":\s*"ACTION"/g) || []).length;
  console.log(`📊 ACTION nodes in steps: ${actionInSteps} (this is correct - they should be in steps)`);
  
  // Check if assertions array contains ACTION nodes (this should be 0)
  const assertionSections = k6Script.match(/assertions":\s*\[([\s\S]*?)\]/g) || [];
  let actionInAssertions = 0;
  assertionSections.forEach(section => {
    const actionMatches = (section.match(/"nodeType":\s*"ACTION"/g) || []).length;
    actionInAssertions += actionMatches;
  });
  console.log(`📊 ACTION nodes in assertions: ${actionInAssertions} (this should be 0)`);
  
  // Check scenario structure
  console.log('\n📋 Analyzing scenario structure...');
  
  const flowAnalysis = generator.getFlowAnalysis();
  console.log(`- Total scenarios: ${flowAnalysis.totalScenarios}`);
  console.log(`- Node types: ${Object.keys(flowAnalysis.nodeTypes).join(', ')}`);
  
  // Extract scenarios for detailed inspection
  const scenarioMatch = k6Script.match(/const FLOW_SCENARIOS = (\[[\s\S]*?\]);/);
  if (scenarioMatch) {
    try {
      // Note: This is just for testing - in real code we wouldn't eval
      const scenarios = JSON.parse(scenarioMatch[1].replace(/'/g, '"'));
      console.log(`\n📊 Scenario Analysis:`);
      
      scenarios.forEach((scenario, index) => {
        console.log(`\nScenario ${index + 1}: ${scenario.name}`);
        console.log(`  Steps: ${scenario.steps.length}`);
        console.log(`  Assertions: ${scenario.assertions.length}`);
        
        // Check for ACTION node assertions
        const actionAssertions = scenario.assertions.filter(a => a.nodeType === 'ACTION');
        if (actionAssertions.length > 0) {
          console.log(`  ❌ Found ${actionAssertions.length} ACTION assertions (should be 0)`);
          actionAssertionsFound += actionAssertions.length;
        } else {
          console.log(`  ✅ No ACTION assertions found`);
        }
        
        // Show step flow
        const stepFlow = scenario.steps.map(step => step.nodeType).join(' → ');
        console.log(`  Flow: ${stepFlow}`);
        
        // Show assertion flow (should skip ACTION nodes)
        const assertionFlow = scenario.assertions.map(a => a.nodeType).join(' → ');
        console.log(`  Assertions: ${assertionFlow}`);
      });
    } catch (e) {
      console.log('Note: Could not parse scenarios for detailed analysis');
    }
  }
  
  // Final result
  console.log('\n🎯 Test Results:');
  if (actionInAssertions === 0) {
    console.log('✅ SUCCESS: No ACTION node assertions found!');
    console.log('✅ ACTION nodes are correctly treated as internal API calls');
    console.log(`✅ ACTION nodes correctly appear in steps (${actionInSteps}) but not in assertions (${actionInAssertions})`);
  } else {
    console.log(`❌ FAILURE: Found ${actionInAssertions} ACTION nodes in assertions`);
    console.log('❌ ACTION nodes should not have assertions');
  }
  
  // Show expected flow pattern
  console.log('\n📋 Expected Flow Pattern:');
  console.log('INPUT → ACTION (internal) → MENU');
  console.log('Assertions: INPUT ↦ MENU (skip ACTION)');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}

console.log('\n🏁 ACTION Node Assertion Test Complete!');