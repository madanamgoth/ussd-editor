/**
 * Generate Updated K6 Test Script without ACTION assertions
 * This creates a sample K6 script using the corrected generator
 */

const K6GraphTestGenerator = require('./load-testing/k6-graph-generator.js');

// Complex test graph with multiple ACTION nodes
const complexTestGraph = {
  "nodes": [
    {
      "id": "start_main",
      "type": "start",
      "data": {
        "type": "START",
        "config": {
          "ussdCode": "*123#",
          "prompts": { "en": "Welcome to Mobile Banking Service" }
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
          "prompts": { "en": "Please enter your 4-digit PIN:" }
        }
      }
    },
    {
      "id": "action_auth",
      "type": "action",
      "data": {
        "type": "ACTION",
        "config": {
          "templates": { "AUTH_PIN": "/api/auth/verify-pin" }
        }
      }
    },
    {
      "id": "menu_services",
      "type": "menu",
      "data": {
        "type": "MENU",
        "config": {
          "prompts": { "en": "Select Service:\n1. Send Money\n2. Pay Bills\n3. Check Balance" }
        }
      }
    },
    {
      "id": "input_amount",
      "type": "input",
      "data": {
        "type": "INPUT",
        "config": {
          "variableName": "SENDMONEYAMOUNT",
          "prompts": { "en": "Enter amount to send:" }
        }
      }
    },
    {
      "id": "input_phone",
      "type": "input",
      "data": {
        "type": "INPUT",
        "config": {
          "variableName": "SENDMONEYRECIVERMSISDN",
          "prompts": { "en": "Enter recipient phone number:" }
        }
      }
    },
    {
      "id": "action_validate",
      "type": "action",
      "data": {
        "type": "ACTION",
        "config": {
          "templates": { "VALIDATE_TRANSFER": "/api/transfer/validate" }
        }
      }
    },
    {
      "id": "action_process",
      "type": "action",
      "data": {
        "type": "ACTION",
        "config": {
          "templates": { "PROCESS_TRANSFER": "/api/transfer/process" }
        }
      }
    },
    {
      "id": "end_success",
      "type": "end",
      "data": {
        "type": "END",
        "config": {
          "prompts": { "en": "Transaction completed successfully! Transaction ID: TXN123456" }
        }
      }
    }
  ],
  "edges": [
    { "source": "start_main", "target": "input_pin" },
    { "source": "input_pin", "target": "action_auth" },
    { "source": "action_auth", "target": "menu_services" },
    { "source": "menu_services", "target": "input_amount", "sourceHandle": "1" },
    { "source": "input_amount", "target": "input_phone" },
    { "source": "input_phone", "target": "action_validate" },
    { "source": "action_validate", "target": "action_process" },
    { "source": "action_process", "target": "end_success" }
  ],
  "timestamp": "2025-10-02T01:00:00Z"
};

const config = {
  baseUrl: 'http://10.22.21.207:9402',
  endpoint: '/MenuManagement/RequestReceiver',
  login: 'Ussd_Bearer1',
  password: 'test',
  phonePrefix: '777',
  sessionIdPrefix: '99'
};

console.log('🚀 Generating Updated K6 Script (No ACTION Assertions)...');

try {
  // Create generator
  const generator = new K6GraphTestGenerator(complexTestGraph, config);
  
  // Generate K6 script
  const k6Script = generator.generateK6Script();
  
  console.log('📊 Generation Results:');
  console.log(`- Script length: ${k6Script.length} characters`);
  
  // Get flow analysis
  const analysis = generator.getFlowAnalysis();
  console.log(`- Total scenarios: ${analysis.totalScenarios}`);
  console.log(`- Node types: ${Object.keys(analysis.nodeTypes).join(', ')}`);
  
  // Verify ACTION exclusion
  const actionInSteps = (k6Script.match(/"nodeType":\s*"ACTION"/g) || []).length;
  const assertionSections = k6Script.match(/assertions":\s*\[([\s\S]*?)\]/g) || [];
  let actionInAssertions = 0;
  assertionSections.forEach(section => {
    const actionMatches = (section.match(/"nodeType":\s*"ACTION"/g) || []).length;
    actionInAssertions += actionMatches;
  });
  
  console.log('\n🔍 Verification Results:');
  console.log(`✅ ACTION nodes in steps: ${actionInSteps} (correct)`);
  console.log(`✅ ACTION nodes in assertions: ${actionInAssertions} (should be 0)`);
  
  if (actionInAssertions === 0) {
    console.log('🎯 SUCCESS: ACTION nodes properly excluded from assertions!');
  } else {
    console.log('❌ ERROR: ACTION nodes found in assertions!');
  }
  
  // Save the generated script
  require('fs').writeFileSync('generated-k6-test-no-action-assertions.js', k6Script);
  console.log('\n💾 Saved: generated-k6-test-no-action-assertions.js');
  
  // Show flow pattern
  console.log('\n📋 Flow Pattern Analysis:');
  console.log('Steps include: START → INPUT → ACTION → MENU → INPUT → INPUT → ACTION → ACTION → END');
  console.log('Assertions only for: INPUT, MENU, INPUT, INPUT, END (ACTION nodes skipped)');
  
  console.log('\n🎉 K6 Script Generation Complete - Ready for Load Testing!');
  
} catch (error) {
  console.error('❌ Generation failed:', error.message);
}

console.log('\n📝 Usage: k6 run generated-k6-test-no-action-assertions.js');