#!/usr/bin/env node

/**
 * Debug the export format - compare current vs expected
 */

console.log('🔍 DEBUG: Export Format Analysis');
console.log('================================');

// Your expected START node format
const expectedStart = {
  "id": "start_1756723559966_699",
  "type": "START",
  "transitions": {
    "123": "input_1756186045582_804"
  },
  "nextNodeType": "INPUT",
  "nextNodePrompts": {
    "en": "Please enter your PIN:",
    "es": "Por favor ingrese su información:",
    "fr": "Veuillez saisir votre entrée:",
    "ar": "يرجى إدخال بياناتك:"
  }
};

// Your expected MENU node format
const expectedMenu = {
  "id": "menu_1756187079757_934",
  "type": "MENU",
  "transitions": {
    "1": "end_1756190011569_521",
    "2": "input_1756187334256_683",
    "3": "end_1756190037908_3",
    "4": "end_1756190359094_368",
    "5": "menu_1756190156209_760",
    "fallback": "end_1756190359094_368"
  },
  "nextNodesMetadata": {
    "1": {
      "nextNodeType": "END",
      "nextNodePrompts": {
        "en": "Thank you for using our service! End of Send Money"
      },
      "nextNodeStoreAttribute": null,
      "nextNodeTemplateId": null
    },
    "2": {
      "nextNodeType": "INPUT",
      "nextNodePrompts": {
        "en": "Please enter your amount:"
      },
      "nextNodeStoreAttribute": null,
      "nextNodeTemplateId": null
    }
    // ... more metadata for each option
  }
};

// Your expected ACTION node format
const expectedAction = {
  "id": "action_1756186083800_637",
  "type": "ACTION",
  "transitions": {
    "200": "menu_1756187079757_934",
    "400": "end_1756187165342_875",
    "500": "end_1756187184482_641"
  },
  "nextNodesMetadata": {
    "200": {
      "nextNodeType": "MENU",
      "nextNodePrompts": {
        "en": "1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu"
      },
      "nextNodeStoreAttribute": null,
      "nextNodeTemplateId": null
    },
    "400": {
      "nextNodeType": "END",
      "nextNodePrompts": {
        "en": "Thank you for using our service! BAD Request"
      },
      "nextNodeStoreAttribute": null,
      "nextNodeTemplateId": null
    },
    "500": {
      "nextNodeType": "END",
      "nextNodePrompts": {
        "en": "Thank you for using our service! Internal Server Error"
      },
      "nextNodeStoreAttribute": null,
      "nextNodeTemplateId": null
    }
  },
  "templateId": "PINVALIDATION"
};

console.log('\n📋 Expected Format Analysis:');
console.log('============================');

console.log('\n1️⃣ START Node (Single Transition):');
console.log('- Has nextNodeType directly on node:', expectedStart.hasOwnProperty('nextNodeType'));
console.log('- Has nextNodePrompts directly on node:', expectedStart.hasOwnProperty('nextNodePrompts'));
console.log('- Has nextNodesMetadata:', expectedStart.hasOwnProperty('nextNodesMetadata'));
console.log('- Transition count:', Object.keys(expectedStart.transitions).length);

console.log('\n2️⃣ MENU Node (Multiple Transitions):');
console.log('- Has nextNodeType directly on node:', expectedMenu.hasOwnProperty('nextNodeType'));
console.log('- Has nextNodePrompts directly on node:', expectedMenu.hasOwnProperty('nextNodePrompts'));
console.log('- Has nextNodesMetadata:', expectedMenu.hasOwnProperty('nextNodesMetadata'));
console.log('- Transition count:', Object.keys(expectedMenu.transitions).length);
console.log('- NextNodesMetadata keys:', Object.keys(expectedMenu.nextNodesMetadata));

console.log('\n3️⃣ ACTION Node (Multiple Transitions):');
console.log('- Has nextNodeType directly on node:', expectedAction.hasOwnProperty('nextNodeType'));
console.log('- Has nextNodePrompts directly on node:', expectedAction.hasOwnProperty('nextNodePrompts'));
console.log('- Has nextNodesMetadata:', expectedAction.hasOwnProperty('nextNodesMetadata'));
console.log('- Transition count:', Object.keys(expectedAction.transitions).length);
console.log('- NextNodesMetadata keys:', Object.keys(expectedAction.nextNodesMetadata));

console.log('\n🎯 Key Pattern:');
console.log('===============');
console.log('✅ Single transition nodes (START, INPUT): nextNodeType + nextNodePrompts directly');
console.log('✅ Multiple transition nodes (MENU, ACTION): nextNodesMetadata with ALL options');
console.log('✅ nextNodesMetadata must include metadata for EVERY transition key');
console.log('✅ Transitions must include ALL configured options, not just visual edges');

console.log('\n🔧 Current Issue:');
console.log('================');
console.log('❌ nextNodesMetadata is missing some transition options');
console.log('❌ Not all configured transitions are being exported');
console.log('❌ Visual edges are being prioritized over node configuration');