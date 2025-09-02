// Example of how K6 handles the directed graph flow

const exampleFlow = [
  {
    id: 'start_1756723559966_699',
    type: 'START',
    transitions: { '123': 'input_1756186045582_804' },
    nextNodeType: 'INPUT',
    nextNodePrompts: { en: 'Please enter your PIN:' }
  },
  {
    id: 'input_1756186045582_804',
    type: 'INPUT',
    transitions: { '*': 'action_1756186083800_637' },
    nextNodeType: 'ACTION',
    nextNodePrompts: { en: '' },
    storeAttribute: 'PIN'
  },
  {
    id: 'action_1756186083800_637',
    type: 'ACTION',
    transitions: {
      '200': 'menu_1756187079757_934',
      '400': 'end_1756187165342_875',
      '500': 'end_1756187184482_641'
    },
    nextNodesMetadata: {
      '200': {
        nextNodeType: 'MENU',
        nextNodePrompts: { en: '1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu' }
      },
      '400': {
        nextNodeType: 'END',
        nextNodePrompts: { en: 'Thank you for using our service! BAD Request' }
      },
      '500': {
        nextNodeType: 'END',
        nextNodePrompts: { en: 'Thank you for using our service! Internal Server Error' }
      }
    },
    templateId: 'PINVALIDATION'
  },
  {
    id: 'menu_1756187079757_934',
    type: 'MENU',
    transitions: {
      '1': 'end_1756190011569_521',
      '2': 'input_1756187334256_683'
    },
    nextNodesMetadata: {
      '1': {
        nextNodeType: 'END',
        nextNodePrompts: { en: 'Thank you for using our service! End of Send Money' }
      },
      '2': {
        nextNodeType: 'INPUT',
        nextNodePrompts: { en: 'Please enter your amount:' }
      }
    }
  }
];

console.log('=== K6 DIRECTED GRAPH PROCESSING ===\n');

// Find START node and simulate K6 path traversal
const startNode = exampleFlow.find(n => n.type === 'START');
console.log('📍 START NODE:', startNode.id);
console.log('   Initial Input: 123 (dial code)');
console.log('   Expected Response: "' + startNode.nextNodePrompts.en + '"');
console.log('   Next Node Type:', startNode.nextNodeType);

// Find INPUT node
const inputNode = exampleFlow.find(n => n.id === startNode.transitions['123']);
console.log('\n📍 INPUT NODE:', inputNode.id);
console.log('   storeAttribute:', inputNode.storeAttribute);
console.log('   User Input: * (will be replaced with PIN like 1234)');
console.log('   Expected Response: "' + (inputNode.nextNodePrompts.en || 'No response - ACTION next') + '"');
console.log('   Next Node Type:', inputNode.nextNodeType);

// Find ACTION node  
const actionNode = exampleFlow.find(n => n.id === inputNode.transitions['*']);
console.log('\n📍 ACTION NODE:', actionNode.id);
console.log('   templateId:', actionNode.templateId);
console.log('   Expected Response: "" (ACTION nodes don\'t return prompts)');
console.log('   Transitions based on HTTP status:');

Object.entries(actionNode.transitions).forEach(([status, nextNodeId]) => {
  const metadata = actionNode.nextNodesMetadata[status];
  console.log('     ' + status + ' → ' + nextNodeId + ' (' + metadata.nextNodeType + ')');
  console.log('         Expected Response: "' + metadata.nextNodePrompts.en + '"');
});

// Show MENU node (200 success path)
const menuNode = exampleFlow.find(n => n.id === actionNode.transitions['200']);
console.log('\n📍 MENU NODE (200 path):', menuNode.id);
console.log('   Menu options with different outcomes:');

Object.entries(menuNode.transitions).forEach(([option, nextNodeId]) => {
  if (menuNode.nextNodesMetadata[option]) {
    const metadata = menuNode.nextNodesMetadata[option];
    console.log('     Option ' + option + ' → ' + nextNodeId + ' (' + metadata.nextNodeType + ')');
    console.log('         Expected Response: "' + metadata.nextNodePrompts.en + '"');
  }
});

console.log('\n=== K6 ASSERTIONS GENERATED ===\n');

// Example scenarios that K6 generates
const scenarios = [
  {
    name: 'PIN_Valid_Menu_Option_1',
    steps: [
      { input: '123', nodeType: 'START', expected: 'Please enter your PIN:', isAction: false },
      { input: '1234', nodeType: 'INPUT', expected: '', isAction: false },
      { input: 'PROCESSED', nodeType: 'ACTION', expected: '', isAction: true },
      { input: '1', nodeType: 'MENU', expected: '1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu', isAction: false },
      { input: 'FINAL', nodeType: 'END', expected: 'Thank you for using our service! End of Send Money', isAction: false }
    ]
  },
  {
    name: 'PIN_Valid_Menu_Option_2',
    steps: [
      { input: '123', nodeType: 'START', expected: 'Please enter your PIN:', isAction: false },
      { input: '1234', nodeType: 'INPUT', expected: '', isAction: false },
      { input: 'PROCESSED', nodeType: 'ACTION', expected: '', isAction: true },
      { input: '2', nodeType: 'MENU', expected: '1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu', isAction: false },
      { input: 'CONTINUE', nodeType: 'INPUT', expected: 'Please enter your amount:', isAction: false }
    ]
  },
  {
    name: 'PIN_Invalid_400_Error',
    steps: [
      { input: '123', nodeType: 'START', expected: 'Please enter your PIN:', isAction: false },
      { input: '9999', nodeType: 'INPUT', expected: '', isAction: false },
      { input: 'FAILED', nodeType: 'ACTION', expected: '', isAction: true },
      { input: 'END', nodeType: 'END', expected: 'Thank you for using our service! BAD Request', isAction: false }
    ]
  }
];

scenarios.forEach((scenario, index) => {
  console.log('--- Scenario ' + (index + 1) + ': ' + scenario.name + ' ---');
  
  scenario.steps.forEach((step, stepIndex) => {
    console.log('Step ' + (stepIndex + 1) + ':');
    console.log('  Input: "' + step.input + '"');
    console.log('  Node Type: ' + step.nodeType);
    console.log('  Expected Response: "' + step.expected + '"');
    console.log('  K6 Assertion: validateUSSDResponse(response, "' + step.expected + '", "' + step.nodeType + '", ' + step.isAction + ')');
    
    if (step.isAction) {
      console.log('  ⚠️ Note: ACTION node - validates response received, not specific content');
    }
    
    console.log('');
  });
  
  console.log('');
});

console.log('=== KEY INSIGHTS ===');
console.log('1. ✅ K6 traverses the directed graph starting from START nodes');
console.log('2. ✅ Each transition edge creates a test step with specific assertions');
console.log('3. ✅ ACTION nodes validate response reception, not content (content comes from target nodes)');
console.log('4. ✅ Dynamic inputs (*) are replaced with realistic data based on storeAttribute (PIN/AMOUNT/RCMSISDN)');
console.log('5. ✅ Multiple paths create separate test scenarios for comprehensive coverage');
console.log('6. ✅ HTTP status codes in ACTION transitions determine which branch to follow');
console.log('7. ✅ nextNodesMetadata provides expected responses for each possible transition');
