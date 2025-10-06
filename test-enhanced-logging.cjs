/**
 * Test Enhanced K6 Script with Detailed Logging
 * This generates a new K6 script with the enhanced validation logging
 */

const K6GraphTestGenerator = require('./load-testing/k6-graph-generator.js');

// Sample graph data
const testGraph = {
  "nodes": [
    {
      "id": "start_test",
      "type": "start",
      "data": {
        "type": "START",
        "config": {
          "ussdCode": "*123#",
          "prompts": { "en": "Welcome" }
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
          "prompts": { "en": "Please enter your pin:" }
        }
      }
    },
    {
      "id": "menu_main",
      "type": "menu",
      "data": {
        "type": "MENU",
        "config": {
          "prompts": { "en": "1. Send Money\n2. Pay Bills" }
        }
      }
    },
    {
      "id": "end_success",
      "type": "end",
      "data": {
        "type": "END",
        "config": {
          "prompts": { "en": "Thank you for using our service! transaction successfull with :sendMoneytransactionId" }
        }
      }
    }
  ],
  "edges": [
    { "source": "start_test", "target": "input_pin" },
    { "source": "input_pin", "target": "menu_main" },
    { "source": "menu_main", "target": "end_success" }
  ],
  "timestamp": "2025-10-02T04:30:00Z"
};

console.log('🧪 Testing Enhanced K6 Script Generation with Detailed Logging');

try {
  const generator = new K6GraphTestGenerator(testGraph, {
    baseUrl: 'http://10.22.21.207:9402',
    loadProfile: 'medium'
  });

  console.log('✅ Generator created successfully');

  const k6Script = generator.generateK6Script();
  
  if (k6Script) {
    console.log('✅ K6 script generated successfully');
    console.log(`📊 Script length: ${k6Script.length} characters`);
    
    // Write the enhanced script
    const fs = require('fs');
    fs.writeFileSync('./enhanced-k6-script-with-logging.js', k6Script, 'utf8');
    console.log('✅ Enhanced K6 script saved to: enhanced-k6-script-with-logging.js');
    
    // Check for enhanced logging features
    const loggingFeatures = [
      { name: 'Step validation logging', pattern: /🔍 Step.*Validation/ },
      { name: 'Actual vs Expected logging', pattern: /📥 ACTUAL RESPONSE.*📋 EXPECTED/ },
      { name: 'Content matching details', pattern: /🔍 Content Matching Check/ },
      { name: 'Dynamic menu validation', pattern: /Dynamic menu validation/ },
      { name: 'END node dynamic content', pattern: /END Node Dynamic Content Validation/ },
      { name: 'Validation summary', pattern: /📊 Validation Summary/ },
      { name: 'Error indicator checking', pattern: /Error indicators found/ }
    ];
    
    console.log('\n🔍 Enhanced Logging Features Check:');
    loggingFeatures.forEach(feature => {
      if (feature.pattern.test(k6Script)) {
        console.log(`✅ ${feature.name}: Found`);
      } else {
        console.log(`❌ ${feature.name}: Missing`);
      }
    });
    
    console.log('\n✅ Enhanced K6 script ready for testing!');
    console.log('📝 This script will now show:');
    console.log('  - Actual response vs expected response for each step');
    console.log('  - Detailed content matching logic');
    console.log('  - Dynamic content validation for END nodes');
    console.log('  - Menu structure validation');
    console.log('  - Error indicator detection');
    console.log('  - Overall validation summary for each step');
    
  } else {
    console.log('❌ Failed to generate K6 script');
  }
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n🚀 Now you can run the enhanced script and see exactly what\'s happening!');
console.log('Command: k6 run enhanced-k6-script-with-logging.js');