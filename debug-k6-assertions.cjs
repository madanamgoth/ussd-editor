/**
 * Debug K6 Assertion Generation
 * This will help us understand why Step 1 has wrong assertions
 */

const fs = require('fs');

// Import the K6 generator (simulated since we can't import ES6 modules directly)
const k6GeneratorContent = fs.readFileSync('./load-testing/k6-graph-generator.js', 'utf8');

console.log('🔧 Debug K6 Assertion Generation');
console.log('='.repeat(50));

// Load the test graph
const testGraph = JSON.parse(fs.readFileSync('./debug-graph-test.json', 'utf8'));

console.log('📋 Test Graph Structure:');
testGraph.nodes.forEach(node => {
  console.log(`  ${node.id} (${node.type.toUpperCase()}): "${node.data?.config?.prompts?.en || 'No prompt'}"`);
});

console.log('\n📋 Test Graph Edges:');
testGraph.edges.forEach(edge => {
  console.log(`  ${edge.source} → ${edge.target}${edge.sourceHandle ? ` (via ${edge.sourceHandle})` : ''}`);
});

console.log('\n🔧 Expected Flow:');
console.log('  Step 0: START(123) → INPUT(PIN) - Expect: "Please enter your pin:"');
console.log('  Step 1: INPUT(*) → MENU - Expect: "1. Send Money\\n2. Pay Bills"');

console.log('\n🔧 Problem Analysis:');
console.log('Based on your logs, Step 1 is expecting "Please enter your pin:" instead of menu content.');
console.log('This suggests either:');
console.log('  1. Your graph has INPUT → INPUT instead of INPUT → MENU');
console.log('  2. The assertion generation is using wrong node data');  
console.log('  3. Your test scenario cache has wrong data');

console.log('\n✅ To fix this, you need to:');
console.log('  1. Check your actual graph structure in the UI');
console.log('  2. Regenerate K6 test from the UI with enhanced debugging');
console.log('  3. Verify the assertions array in the generated script');

// Create a corrected scenario for testing
const correctedScenario = {
  name: "Flow_start_1758807107061_956_Path_1",
  startInput: "123",
  steps: [
    {
      input: "123",
      nodeType: "START", 
      nextNodeType: "INPUT"
    },
    {
      input: "*",
      storeAttribute: "USERPIN",
      nodeType: "INPUT",
      nextNodeType: "MENU"  
    }
  ],
  assertions: [
    {
      expectedResponse: "Please enter your pin:",
      nodeType: "INPUT",
      assertionType: "input"
    },
    {
      expectedResponse: "1. Send Money\n2. Pay Bills", // ✅ CORRECTED!
      nodeType: "MENU",  // ✅ CORRECTED!
      assertionType: "menu"  // ✅ CORRECTED!
    }
  ]
};

fs.writeFileSync('./corrected-scenario.json', JSON.stringify(correctedScenario, null, 2));
console.log('\n✅ Corrected scenario saved to corrected-scenario.json');

console.log('\n🚀 Next Steps:');
console.log('  1. Check your UI graph - make sure PIN input leads to MENU node');
console.log('  2. Regenerate K6 test from UI (it now has enhanced debugging)');  
console.log('  3. If still wrong, replace scenario data with corrected-scenario.json');