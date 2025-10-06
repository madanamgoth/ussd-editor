/**
 * Test script for the new K6 Graph Generator
 * Tests the new canvas-based K6 test generation logic
 */

const K6GraphTestGenerator = require('./load-testing/k6-graph-generator.js');

console.log('🧪 Testing K6 Graph Generator with your example flow...\n');

// Your example canvas graph structure
const exampleGraphData = {
  "nodes": [
    {
      "id": "start_1758807107061_956",
      "type": "start",
      "position": { "x": 50, "y": 270 },
      "data": {
        "id": "start_1758807107061_956",
        "label": "Start",
        "type": "START",
        "config": {
          "prompts": {
            "en": "Welcome to our service",
            "es": "Bienvenido a nuestro servicio",
            "fr": "Bienvenue dans notre service",
            "ar": "مرحباً بكم في خدمتنا"
          },
          "transitions": {
            "": "input_1758807120912_174"
          },
          "fallback": "",
          "defaultLanguage": "en",
          "ussdCode": "123"
        }
      }
    },
    {
      "id": "input_1758807120912_174",
      "type": "input",
      "position": { "x": 440, "y": 270 },
      "data": {
        "id": "input_1758807120912_174",
        "label": "PIN NODE",
        "type": "INPUT",
        "config": {
          "prompts": {
            "en": "Please enter your pin:",
            "es": "Por favor ingrese su información:",
            "fr": "Veuillez saisir votre entrée:",
            "ar": "يرجى إدخال بياناتك:"
          },
          "transitions": {
            "*": "",
            "": "action_1758807220367_192"
          },
          "fallback": "",
          "defaultLanguage": "en",
          "variableName": "USERPIN",
          "matchPattern": "*"
        }
      }
    },
    {
      "id": "action_1758807220367_192",
      "type": "action",
      "position": { "x": 830, "y": 270 },
      "data": {
        "id": "action_1758807220367_192",
        "label": "VALIDATE USER PIN",
        "type": "ACTION",
        "config": {
          "prompts": { "en": "", "es": "", "fr": "", "ar": "" },
          "transitions": {
            "200": "",
            "400": "",
            "500": "",
            "response-200-condition1": "menu_1758807895301_701"
          },
          "fallback": "",
          "defaultLanguage": "en",
          "templates": [
            {
              "_id": "USERPINVALIDATION",
              "target": {
                "endpoint": "http://localhost:1080/USERPINVALIDATION",
                "method": "POST"
              }
            }
          ]
        }
      }
    },
    {
      "id": "menu_1758807895301_701",
      "type": "menu",
      "position": { "x": 1220, "y": 270 },
      "data": {
        "id": "menu_1758807895301_701",
        "label": "MAIN MENU",
        "type": "MENU",
        "config": {
          "prompts": {
            "en": "1. Send Money\n2. Pay Bills",
            "es": "1. Enviar Dinero\n2. Consultar Saldo\n3. Pagar Facturas\n4. Info de Cuenta",
            "fr": "1. Envoyer de l'Argent\n2. Vérifier le Solde\n3. Payer les Factures\n4. Info Compte",
            "ar": "1. إرسال الأموال\n2. فحص الرصيد\n3. دفع الفواتير\n4. معلومات الحساب"
          },
          "transitions": {
            "1": "input_1758807985403_627",
            "2": "action_1758808954335_309"
          },
          "fallback": "",
          "defaultLanguage": "en",
          "compositCode": "234234"
        }
      }
    },
    {
      "id": "input_1758807985403_627",
      "type": "input",
      "position": { "x": 1610, "y": 40 },
      "data": {
        "id": "input_1758807985403_627",
        "label": "Input",
        "type": "INPUT",
        "config": {
          "prompts": {
            "en": "Please enter your amount:",
            "es": "Por favor ingrese su información:",
            "fr": "Veuillez saisir votre entrée:",
            "ar": "يرجى إدخال بياناتك:"
          },
          "transitions": {
            "*": "",
            "": "input_1758807987327_926"
          },
          "fallback": "",
          "defaultLanguage": "en",
          "variableName": "SENDMONEYAMOUNT",
          "matchPattern": "*"
        }
      }
    },
    {
      "id": "end_1758808809957_245",
      "type": "end",
      "position": { "x": 2780, "y": -90 },
      "data": {
        "id": "end_1758808809957_245",
        "label": "End",
        "type": "END",
        "config": {
          "prompts": {
            "en": "Thank you for using our service! transaction successful with :sendMoneytransactionId",
            "es": "¡Gracias por usar nuestro servicio!",
            "fr": "Merci d'utiliser notre service!",
            "ar": "شكراً لاستخدام خدمتنا!"
          },
          "transitions": {},
          "fallback": "",
          "defaultLanguage": "en",
          "compositCode": "9800"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "start_1758807107061_956",
      "target": "input_1758807120912_174",
      "label": "➡️ Next"
    },
    {
      "id": "edge-2",
      "source": "input_1758807120912_174",
      "target": "action_1758807220367_192",
      "label": "➡️ Next"
    },
    {
      "id": "edge-3",
      "source": "action_1758807220367_192",
      "target": "menu_1758807895301_701",
      "sourceHandle": "response-200-condition1",
      "label": "response-200-condition1"
    },
    {
      "id": "edge-4",
      "source": "menu_1758807895301_701",
      "target": "input_1758807985403_627",
      "sourceHandle": "option-1",
      "label": "📋 Option 1"
    },
    {
      "id": "edge-5",
      "source": "input_1758807985403_627",
      "target": "end_1758808809957_245",
      "label": "➡️ Next"
    }
  ],
  "timestamp": "2025-10-01T20:06:27.905Z"
};

// Test configuration
const testConfig = {
  baseUrl: 'http://localhost:9401',
  endpoint: '/MenuManagement/RequestReceiver',
  login: 'Ussd_Bearer1',
  password: 'test',
  phonePrefix: '777',
  sessionIdPrefix: '99',
  loadProfile: 'moderate'
};

try {
  console.log('📊 Creating K6 Graph Generator...');
  const generator = new K6GraphTestGenerator(exampleGraphData, testConfig);
  
  console.log('📈 Getting flow analysis...');
  const analysis = generator.getFlowAnalysis();
  console.log('Flow Analysis:', JSON.stringify(analysis, null, 2));
  
  console.log('🔍 Generating test cases...');
  const testCases = generator.generateTestCases();
  console.log(`Generated ${testCases.length} test cases:`);
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest Case ${index + 1}: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log('Steps:');
    testCase.steps.forEach((step, stepIndex) => {
      console.log(`  ${step.stepNumber}. ${step.action} -> ${step.expectedResult}`);
    });
  });
  
  console.log('\n🚀 Generating K6 script...');
  const k6Script = generator.generateK6Script();
  
  console.log('✅ K6 script generated successfully!');
  console.log(`📄 Script length: ${k6Script.length} characters`);
  console.log(`🎯 Contains ${analysis.totalScenarios} scenarios`);
  console.log(`📋 Covers ${analysis.nodeTypes.join(', ')} node types`);
  
  // Save script to file for inspection
  const fs = require('fs');
  const scriptPath = './generated-k6-test.js';
  fs.writeFileSync(scriptPath, k6Script);
  console.log(`💾 Script saved to: ${scriptPath}`);
  
  console.log('\n🎉 Test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
}