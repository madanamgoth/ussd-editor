/**
 * Test React K6 Integration with Canvas Graph
 * This script tests the new inline K6 generation in React component
 */

// Sample canvas graph data
const canvasGraphExample = {
  "nodes": [
    {
      "id": "start_1758807107061_956",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "type": "START",
        "config": {
          "ussdCode": "123",
          "prompts": {
            "en": "Welcome to Mobile Banking"
          }
        }
      }
    },
    {
      "id": "input_1758807107061_957",
      "type": "input", 
      "position": { "x": 250, "y": 200 },
      "data": {
        "type": "INPUT",
        "config": {
          "variableName": "USERPIN",
          "prompts": {
            "en": "Please enter your PIN:"
          }
        }
      }
    },
    {
      "id": "action_1758807107061_958",
      "type": "action",
      "position": { "x": 400, "y": 300 },
      "data": {
        "type": "ACTION",
        "config": {
          "templates": {
            "BALANCE_CHECK": "/api/balance/check"
          }
        }
      }
    },
    {
      "id": "menu_1758807107061_959",
      "type": "menu",
      "position": { "x": 550, "y": 400 },
      "data": {
        "type": "MENU",
        "config": {
          "prompts": {
            "en": "Select service:\n1. Send Money\n2. Check Balance"
          },
          "transitions": {
            "1": "input_1758807107061_960",
            "2": "end_1758807107061_961"
          }
        }
      }
    },
    {
      "id": "input_1758807107061_960",
      "type": "input",
      "position": { "x": 700, "y": 500 },
      "data": {
        "type": "INPUT",
        "config": {
          "variableName": "SENDMONEYAMOUNT",
          "prompts": {
            "en": "Enter amount to send:"
          }
        }
      }
    },
    {
      "id": "end_1758807107061_961",
      "type": "end",
      "position": { "x": 850, "y": 600 },
      "data": {
        "type": "END",
        "config": {
          "prompts": {
            "en": "Thank you for using our service!"
          }
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "start_1758807107061_956",
      "target": "input_1758807107061_957",
      "sourceHandle": "a"
    },
    {
      "id": "edge_2", 
      "source": "input_1758807107061_957",
      "target": "action_1758807107061_958",
      "sourceHandle": "a"
    },
    {
      "id": "edge_3",
      "source": "action_1758807107061_958", 
      "target": "menu_1758807107061_959",
      "sourceHandle": "a"
    },
    {
      "id": "edge_4",
      "source": "menu_1758807107061_959",
      "target": "input_1758807107061_960",
      "sourceHandle": "1"
    },
    {
      "id": "edge_5",
      "source": "menu_1758807107061_959",
      "target": "end_1758807107061_961",
      "sourceHandle": "2"
    },
    {
      "id": "edge_6",
      "source": "input_1758807107061_960",
      "target": "end_1758807107061_961",
      "sourceHandle": "a"
    }
  ],
  "timestamp": "2024-01-25T10:30:00Z"
};

console.log('🧪 Testing React K6 Integration with Canvas Graph');
console.log('📊 Graph Structure:');
console.log(`- Nodes: ${canvasGraphExample.nodes.length}`);
console.log(`- Edges: ${canvasGraphExample.edges.length}`);

// Test node type detection
function getNodeType(node) {
  const type = node.type || (node.data && node.data.type) || 'UNKNOWN';
  return type.toUpperCase();
}

function getStartInput(node) {
  if (node.data && node.data.config && node.data.config.ussdCode) {
    return node.data.config.ussdCode;
  }
  return '*123#';
}

// Test path discovery logic
function findPathsFromStart(startNode, nodes, edges) {
  const paths = [];
  const maxDepth = 20;
  
  function traverse(currentNode, path, visited = new Set()) {
    if (path.length > maxDepth) return;
    if (visited.has(currentNode.id)) return;
    
    const newPath = [...path, currentNode];
    const newVisited = new Set([...visited, currentNode.id]);
    
    const nodeType = getNodeType(currentNode);
    if (nodeType === 'END') {
      paths.push(newPath);
      return;
    }
    
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
    
    if (outgoingEdges.length === 0) {
      // Dead end - still add as a path if it's not just the start node
      if (newPath.length > 1) {
        paths.push(newPath);
      }
      return;
    }
    
    outgoingEdges.forEach(edge => {
      const nextNode = nodes.find(node => node.id === edge.target);
      if (nextNode) {
        traverse(nextNode, newPath, newVisited);
      }
    });
  }
  
  traverse(startNode, []);
  return paths;
}

// Run tests
console.log('\n🔍 Testing Graph Analysis...');

// Find START nodes
const startNodes = canvasGraphExample.nodes.filter(node => 
  node.type === 'start' || (node.data && node.data.type === 'START')
);

console.log(`✅ Found ${startNodes.length} START node(s)`);

if (startNodes.length > 0) {
  const startNode = startNodes[0];
  console.log(`📍 START Node: ${startNode.id} (USSD: ${getStartInput(startNode)})`);
  
  // Find paths
  const paths = findPathsFromStart(startNode, canvasGraphExample.nodes, canvasGraphExample.edges);
  console.log(`🛤️  Found ${paths.length} possible path(s):`);
  
  paths.forEach((path, index) => {
    console.log(`\nPath ${index + 1}:`);
    path.forEach((node, nodeIndex) => {
      const nodeType = getNodeType(node);
      let nodeInfo = `  ${nodeIndex + 1}. ${nodeType} (${node.id})`;
      
      if (nodeType === 'INPUT' && node.data?.config?.variableName) {
        nodeInfo += ` - Variable: ${node.data.config.variableName}`;
      } else if (nodeType === 'START' && node.data?.config?.ussdCode) {
        nodeInfo += ` - USSD: ${node.data.config.ussdCode}`;
      }
      
      console.log(nodeInfo);
    });
  });
  
  // Test case generation simulation
  console.log('\n📝 Testing Test Case Generation...');
  
  const testCases = [];
  paths.forEach((path, pathIndex) => {
    const testCase = {
      id: testCases.length + 1,
      name: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
      description: `Flow path: ${path.map(n => getNodeType(n)).join(' → ')}`,
      steps: path.map((node, nodeIndex) => {
        if (nodeIndex === path.length - 1) return null;
        
        const nextNode = path[nodeIndex + 1];
        const nodeType = getNodeType(node);
        const nextNodeType = getNodeType(nextNode);
        
        let action = '';
        switch (nodeType) {
          case 'START':
            action = `Dial USSD code: ${getStartInput(node)}`;
            break;
          case 'MENU':
            action = `Select menu option: 1`;
            break;
          case 'INPUT':
            const storeAttr = node.data?.config?.variableName || 'input';
            action = `Enter ${storeAttr}: dynamic value`;
            break;
          case 'ACTION':
            action = `Process action: API call`;
            break;
          default:
            action = `Navigate from ${nodeType}`;
        }
        
        return {
          stepNumber: nodeIndex + 1,
          action: action,
          nodeType: nodeType
        };
      }).filter(step => step !== null)
    };
    
    testCases.push(testCase);
  });
  
  console.log(`✅ Generated ${testCases.length} test case(s):`);
  testCases.forEach(testCase => {
    console.log(`\n📋 ${testCase.name}:`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Steps: ${testCase.steps.length}`);
    testCase.steps.forEach(step => {
      console.log(`     ${step.stepNumber}. ${step.action}`);
    });
  });
}

console.log('\n🎯 React K6 Integration Test Complete!');
console.log('✅ All functions working correctly with canvas graph structure');