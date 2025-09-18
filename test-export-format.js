#!/usr/bin/env node

/**
 * Test the reverted exportToFlowFormat function
 */

// Mock data similar to your flow structure
const mockNodes = [
  {
    id: "start_1756207115407_940",
    data: {
      type: "START",
      config: {
        prompts: {
          en: "Welcome to our service",
          es: "Bienvenido a nuestro servicio",
          fr: "Bienvenue dans notre service",  
          ar: "مرحباً بكم في خدمتنا"
        },
        transitions: { "": "input_1756186045582_804" }
      }
    }
  },
  {
    id: "menu_1756187079757_934", 
    data: {
      type: "MENU",
      config: {
        prompts: {
          en: "1. Check Balance\n2. Send Money\n3. Pay Bills\n4. Exit\n5. Next Menu",
          es: "1. Enviar Dinero\n2. Consultar Saldo\n3. Pagar Facturas\n4. Exit",
          fr: "1. Envoyer de l'Argent\n2. Vérifier le Solde\n3. Payer les Factures\n4. Exit",
          ar: "1. إرسال الأموال\n2. فحص الرصيد\n3. دفع الفواتير\n4. معلومات الحساب"
        },
        transitions: {
          "1": "end_1756190011569_521",
          "2": "input_1756187334256_683", 
          "3": "end_1756190037908_3",
          "4": "end_1756190359094_368",
          "5": "menu_1756190156209_760",
          "fallback": "end_1756190359094_368"
        }
      }
    }
  },
  {
    id: "end_1756190011569_521",
    data: {
      type: "END", 
      config: {
        prompts: {
          en: "Thank you for using our service! End of Send Money",
          es: "¡Gracias por usar nuestro servicio!",
          fr: "Merci d'utiliser notre service!",
          ar: "شكراً لاستخدام خدمتنا!"
        },
        transitions: {}
      }
    }
  }
];

const mockEdges = [
  { source: "start_1756207115407_940", target: "input_1756186045582_804", sourceHandle: "" },
  { source: "menu_1756187079757_934", target: "end_1756190011569_521", sourceHandle: "option-1" },
  { source: "menu_1756187079757_934", target: "input_1756187334256_683", sourceHandle: "option-2" }
];

// Minimal version of the export function for testing
function exportToFlowFormat(nodes, edges) {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  const getNextNodeMetadata = (currentNodeId, targetNodeId) => {
    const targetNode = nodeMap.get(targetNodeId);
    if (!targetNode) return null;
    
    return {
      nextNodeType: targetNode.data.type,
      nextNodePrompts: targetNode.data.config?.prompts || {},
      nextNodeStoreAttribute: targetNode.data.config?.storeAttribute || targetNode.data.config?.variableName || null,
      nextNodeTemplateId: targetNode.data.config?.templateId || null
    };
  };
  
  return nodes.map(node => {
    const nodeType = node.data.type;
    const config = node.data.config;
    
    let cleanTransitions = {};
    let nextNodeMetadata = {};
    
    if (edges) {
      const nodeEdges = edges.filter(edge => edge.source === node.id);
      nodeEdges.forEach(edge => {
        if (edge.target && edge.target.trim() !== '') {
          const sourceHandle = edge.sourceHandle || '';
          const metadata = getNextNodeMetadata(node.id, edge.target);
          
          if (nodeType === 'MENU') {
            if (sourceHandle.startsWith('option-')) {
              const optionNumber = sourceHandle.replace('option-', '');
              cleanTransitions[optionNumber] = edge.target;
              if (metadata) {
                nextNodeMetadata[optionNumber] = metadata;
              }
            }
          } else if (nodeType === 'START') {
            let key = sourceHandle || '';
            if (node.data.config?.ussdCode && node.data.config.ussdCode.trim() !== '') {
              key = node.data.config.ussdCode.trim();
            } else {
              key = '';
            }
            cleanTransitions[key] = edge.target;
            if (metadata) {
              nextNodeMetadata[key] = metadata;
            }
          }
        }
      });
    }
    
    // Merge with config transitions
    if (config.transitions) {
      Object.entries(config.transitions).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          if (nodeType === 'MENU') {
            const cleanKey = key.startsWith('option-') ? key.replace('option-', '') : key;
            if (/^\d+$/.test(cleanKey) || cleanKey === 'fallback' || cleanKey === '*') {
              cleanTransitions[cleanKey] = value;
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[cleanKey] = metadata;
              }
            }
          } else {
            if (!cleanTransitions[key] && key && key.trim() !== '') {
              cleanTransitions[key] = value;
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[key] = metadata;
              }
            }
          }
        }
      });
    }

    // Build clean node - EXACTLY like previous version
    const cleanNode = {
      id: node.id,
      type: nodeType,
      transitions: cleanTransitions
    };

    const transitionKeys = Object.keys(cleanTransitions);
    if (transitionKeys.length === 1) {
      const primaryKey = transitionKeys[0];
      const metadata = nextNodeMetadata[primaryKey];
      if (metadata) {
        cleanNode.nextNodeType = metadata.nextNodeType;
        cleanNode.nextNodePrompts = metadata.nextNodePrompts;
        if (metadata.nextNodeStoreAttribute) {
          cleanNode.nextNodeStoreAttribute = metadata.nextNodeStoreAttribute;
        }
        if (metadata.nextNodeTemplateId) {
          cleanNode.nextNodeTemplateId = metadata.nextNodeTemplateId;
        }
      }
    } else if (transitionKeys.length > 1) {
      cleanNode.nextNodesMetadata = {};
      transitionKeys.forEach(key => {
        if (nextNodeMetadata[key]) {
          cleanNode.nextNodesMetadata[key] = nextNodeMetadata[key];
        }
      });
    }

    return cleanNode;
  });
}

console.log('🧪 Testing Previous Version Export Format');
console.log('=========================================');

const result = exportToFlowFormat(mockNodes, mockEdges);

console.log('\n📋 Exported Flow:');
console.log(JSON.stringify(result, null, 2));

console.log('\n✅ Format Check:');
result.forEach((node, index) => {
  console.log(`\nNode ${index + 1}: ${node.type}`);
  console.log(`- Has prompts property: ${node.hasOwnProperty('prompts')}`);
  console.log(`- Has nextNodesMetadata: ${node.hasOwnProperty('nextNodesMetadata')}`);
  console.log(`- Has nextNodePrompts: ${node.hasOwnProperty('nextNodePrompts')}`);
  console.log(`- Transition count: ${Object.keys(node.transitions).length}`);
});

console.log('\n🎯 This should match your previous version format:');
console.log('- NO prompts property on individual nodes');
console.log('- nextNodesMetadata for nodes with multiple transitions');
console.log('- nextNodePrompts for nodes with single transitions');