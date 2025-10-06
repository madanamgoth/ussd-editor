/**
 * Test Dynamic Menu Configuration in React Component
 * Simulate the UI scenario where user configures dynamic menu content
 */

// Simulate the React component logic
const testDynamicMenuIntegration = () => {
  console.log('🧪 Testing Dynamic Menu Configuration in React Component');

  // Mock canvas graph data
  const nodes = [
    {
      id: 'start_test',
      type: 'start',
      data: { type: 'START', config: { ussdCode: '*123#' } }
    },
    {
      id: 'dynamic-menu_1758809736438_303',
      type: 'dynamic-menu',
      data: { type: 'DYNAMIC-MENU', config: { prompts: { en: 'Please select an option:' } } }
    },
    {
      id: 'end_test',
      type: 'end',
      data: { type: 'END', config: { prompts: { en: 'Thank you!' } } }
    }
  ];

  const edges = [
    { source: 'start_test', target: 'dynamic-menu_1758809736438_303' },
    { source: 'dynamic-menu_1758809736438_303', target: 'end_test' }
  ];

  // User's dynamic menu configuration from UI
  const dynamicMenuConfig = {
    'dynamic-menu_1758809736438_303': {
      nodeId: 'dynamic-menu_1758809736438_303',
      nodeName: 'Dynamic Menu dynamic-menu_1758809736438_303',
      menuContent: '1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service',
      defaultContent: 'Please select an option:'
    }
  };

  console.log('📊 Mock Data Setup:');
  console.log('  Nodes:', nodes.length);
  console.log('  Edges:', edges.length);
  console.log('  Dynamic Menu Config:', Object.keys(dynamicMenuConfig).length);

  // Simulate the React component logic
  const generateK6ScriptFromGraph = (nodes, edges, config, dynamicMenusConfig = {}) => {
    console.log('📊 Analyzing canvas graph structure...');
    console.log('🎛️ Dynamic Menu Config received:', dynamicMenusConfig);
    
    // Store dynamic menus for assertion creation
    const dynamicMenusForAssertions = dynamicMenusConfig;

    const getNodeType = (node) => {
      const type = node.type || (node.data && node.data.type) || 'UNKNOWN';
      return type.toUpperCase();
    };

    const createAssertionFromNodeWithMenus = (node) => {
      const nodeType = getNodeType(node);
      
      // ACTION nodes are internal API calls - no user-facing assertions needed
      if (nodeType === 'ACTION') {
        return null;
      }
      
      let expectedResponse = '';
      
      // For DYNAMIC-MENU nodes, check custom config first
      if (nodeType === 'DYNAMIC-MENU') {
        console.log(`🔍 DYNAMIC-MENU assertion for node ${node.id}:`);
        console.log('  Available config:', dynamicMenusForAssertions[node.id]);
        // Use user-provided dynamic menu content if available
        if (dynamicMenusForAssertions[node.id] && dynamicMenusForAssertions[node.id].menuContent && dynamicMenusForAssertions[node.id].menuContent.trim()) {
          expectedResponse = dynamicMenusForAssertions[node.id].menuContent;
          console.log(`  ✅ Using custom content: "${expectedResponse}"`);
        } else if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
          expectedResponse = node.data.config.prompts.en;
          console.log(`  ℹ️ Using node prompt: "${expectedResponse}"`);
        } else {
          expectedResponse = 'Please select an option:';
          console.log(`  ⚠️ Using default content: "${expectedResponse}"`);
        }
      } else if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
        expectedResponse = node.data.config.prompts.en;
      } else {
        // Fallback based on node type
        switch (nodeType) {
          case 'INPUT':
            expectedResponse = 'Please enter your input:';
            break;
          case 'MENU':
            expectedResponse = 'Please select an option:';
            break;
          case 'END':
            expectedResponse = 'Thank you for using our service!';
            break;
          default:
            expectedResponse = 'Please proceed';
        }
      }
      
      return {
        expectedResponse: expectedResponse,
        nodeType: nodeType,
        assertionType: nodeType.toLowerCase()
      };
    };

    // Test the DYNAMIC-MENU node
    const dynamicMenuNode = nodes.find(node => getNodeType(node) === 'DYNAMIC-MENU');
    if (dynamicMenuNode) {
      console.log('\n🎯 Testing DYNAMIC-MENU Assertion Creation:');
      const assertion = createAssertionFromNodeWithMenus(dynamicMenuNode);
      return assertion;
    }

    return null;
  };

  // Mock config
  const config = {
    baseUrl: 'http://10.22.21.207:9402',
    loadProfile: 'moderate'
  };

  // Test the generation
  const result = generateK6ScriptFromGraph(nodes, edges, config, dynamicMenuConfig);

  console.log('\n📊 Test Results:');
  if (result && result.expectedResponse === '1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service') {
    console.log('✅ SUCCESS: Dynamic menu content correctly applied!');
    console.log(`Expected Response: "${result.expectedResponse}"`);
    console.log(`Node Type: ${result.nodeType}`);
    console.log(`Assertion Type: ${result.assertionType}`);
  } else {
    console.log('❌ FAILED: Dynamic menu content not applied correctly');
    console.log('Result:', result);
  }

  return result;
};

// Run the test
testDynamicMenuIntegration();

console.log('\n🔧 If this test passes, your UI should now generate K6 scripts with custom menu content!');
console.log('🎯 Expected in K6 script:');
console.log('  "expectedResponse": "1.Electricity Board\\n2.Water Supply Dept\\n3.Mobile Recharge\\n4.Gas Pipeline Service"');
console.log('Instead of:');
console.log('  "expectedResponse": "Please select an option:"');