#!/usr/bin/env node

/**
 * Test the fixed export flow format
 */

// Mock flow data to test export
const mockNodes = [
  {
    id: "menu_test",
    data: {
      type: "MENU",
      config: {
        prompts: {
          "en": "1. Check Balance\n2. Send Money\n3. Pay Bills",
          "es": "1. Consultar Saldo\n2. Enviar Dinero\n3. Pagar Facturas"
        },
        transitions: {
          "1": "end_balance",
          "2": "input_amount",
          "3": "end_bills"
        }
      }
    }
  },
  {
    id: "input_amount",
    data: {
      type: "INPUT",
      config: {
        prompts: {
          "en": "Please enter amount:",
          "es": "Por favor ingrese cantidad:"
        },
        storeAttribute: "AMOUNT",
        transitions: {
          "*": "action_send"
        }
      }
    }
  },
  {
    id: "action_send",
    data: {
      type: "ACTION",
      config: {
        prompts: {
          "en": "",
          "es": ""
        },
        templateId: "SEND_MONEY",
        transitions: {
          "200": "end_success",
          "400": "end_error"
        }
      }
    }
  },
  {
    id: "end_balance",
    data: {
      type: "END",
      config: {
        prompts: {
          "en": "Your balance is ${BALANCE}",
          "es": "Su saldo es ${BALANCE}"
        }
      }
    }
  },
  {
    id: "end_bills",
    data: {
      type: "END",
      config: {
        prompts: {
          "en": "Bill payment feature",
          "es": "Función de pago de facturas"
        }
      }
    }
  },
  {
    id: "end_success",
    data: {
      type: "END",
      config: {
        prompts: {
          "en": "Transaction successful",
          "es": "Transacción exitosa"
        }
      }
    }
  },
  {
    id: "end_error",
    data: {
      type: "END",
      config: {
        prompts: {
          "en": "Transaction failed",
          "es": "Transacción falló"
        }
      }
    }
  }
];

const mockEdges = [
  { source: "menu_test", target: "end_balance", sourceHandle: "option-1" },
  { source: "menu_test", target: "input_amount", sourceHandle: "option-2" },
  { source: "menu_test", target: "end_bills", sourceHandle: "option-3" },
  { source: "input_amount", target: "action_send", sourceHandle: "*" },
  { source: "action_send", target: "end_success", sourceHandle: "transaction-200" },
  { source: "action_send", target: "end_error", sourceHandle: "transaction-400" }
];

// Simulate the export function (simplified version)
function simulateExport(nodes, edges) {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  const getNextNodeMetadata = (currentNodeId, targetNodeId) => {
    const targetNode = nodeMap.get(targetNodeId);
    if (!targetNode) return null;
    
    return {
      nextNodeType: targetNode.data.type,
      nextNodePrompts: targetNode.data.config?.prompts || {},
      nextNodeStoreAttribute: targetNode.data.config?.storeAttribute || null,
      nextNodeTemplateId: targetNode.data.config?.templateId || null
    };
  };

  return nodes.map(node => {
    const nodeType = node.data.type;
    const config = node.data.config;
    
    // Build transitions from edges
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
          } else if (nodeType === 'INPUT') {
            cleanTransitions['*'] = edge.target;
            if (metadata) {
              nextNodeMetadata['*'] = metadata;
            }
          } else if (nodeType === 'ACTION') {
            let cleanKey = sourceHandle;
            if (sourceHandle.startsWith('transaction-')) {
              cleanKey = sourceHandle.replace('transaction-', '');
            }
            cleanTransitions[cleanKey] = edge.target;
            if (metadata) {
              nextNodeMetadata[cleanKey] = metadata;
            }
          }
        }
      });
    }

    // Build the clean node
    const cleanNode = {
      id: node.id,
      type: nodeType,
      transitions: cleanTransitions
    };

    // Add current node's prompts
    if (config.prompts) {
      cleanNode.prompts = config.prompts;
    }

    // Add next node metadata
    const transitionKeys = Object.keys(cleanTransitions);
    if (transitionKeys.length > 1) {
      cleanNode.nextNodesMetadata = {};
      transitionKeys.forEach(key => {
        if (nextNodeMetadata[key]) {
          cleanNode.nextNodesMetadata[key] = nextNodeMetadata[key];
        }
      });
    }

    // Add optional fields
    if (config.storeAttribute && config.storeAttribute.trim() !== '') {
      cleanNode.storeAttribute = config.storeAttribute;
    }
    
    if (config.templateId && config.templateId.trim() !== '') {
      cleanNode.templateId = config.templateId;
    }

    return cleanNode;
  });
}

console.log('🧪 Testing Fixed Export Format');
console.log('==============================');

const result = simulateExport(mockNodes, mockEdges);

console.log('\n📋 Exported Flow:');
console.log(JSON.stringify(result, null, 2));

// Check specific menu node
const menuNode = result.find(n => n.type === 'MENU');
console.log('\n🔍 Menu Node Analysis:');
console.log('Has prompts:', !!menuNode?.prompts);
console.log('Has nextNodesMetadata:', !!menuNode?.nextNodesMetadata);
console.log('Transitions count:', Object.keys(menuNode?.transitions || {}).length);

if (menuNode?.nextNodesMetadata) {
  console.log('nextNodesMetadata keys:', Object.keys(menuNode.nextNodesMetadata));
  console.log('Sample metadata for option 1:', menuNode.nextNodesMetadata['1']);
}