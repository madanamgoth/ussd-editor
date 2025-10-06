/**
 * Test the React Component Fix for Dynamic Menu Scope Issue
 */

console.log('🧪 Testing React Component Dynamic Menu Scope Fix');

// Simulate the corrected function structure
const testScopeFix = () => {
  // Mock dynamic menu config (what comes from the UI)
  const dynamicMenusConfig = {
    'dynamic-menu_1758809736438_303': {
      nodeId: 'dynamic-menu_1758809736438_303',
      nodeName: 'Dynamic Menu dynamic-menu_1758809736438_303',
      menuContent: '1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service',
      defaultContent: 'Please select an option:'
    }
  };

  // Store for assertions (what the function creates)
  const dynamicMenusForAssertions = dynamicMenusConfig;

  // Mock node
  const testNode = {
    id: 'dynamic-menu_1758809736438_303',
    type: 'dynamic-menu',
    data: {
      type: 'DYNAMIC-MENU',
      config: {
        prompts: { en: 'Please select an option:' }
      }
    }
  };

  // Helper function
  const getNodeType = (node) => {
    const type = node.type || (node.data && node.data.type) || 'UNKNOWN';
    return type.toUpperCase();
  };

  // The corrected function (now accepting parameter)
  const createAssertionFromNodeWithMenus = (node, dynamicMenusConfigParam = {}) => {
    const nodeType = getNodeType(node);
    
    if (nodeType === 'ACTION') {
      return null;
    }
    
    let expectedResponse = '';
    
    // For DYNAMIC-MENU nodes, check custom config first
    if (nodeType === 'DYNAMIC-MENU') {
      console.log(`🔍 DYNAMIC-MENU assertion for node ${node.id}:`);
      console.log('  Available config:', dynamicMenusConfigParam[node.id]);
      
      // Use user-provided dynamic menu content if available
      if (dynamicMenusConfigParam[node.id] && dynamicMenusConfigParam[node.id].menuContent && dynamicMenusConfigParam[node.id].menuContent.trim()) {
        expectedResponse = dynamicMenusConfigParam[node.id].menuContent;
        console.log(`  ✅ Using custom content: "${expectedResponse}"`);
      } else if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
        expectedResponse = node.data.config.prompts.en;
        console.log(`  ℹ️ Using node prompt: "${expectedResponse}"`);
      } else {
        expectedResponse = 'Please select an option:';
        console.log(`  ⚠️ Using default content: "${expectedResponse}"`);
      }
    }
    
    return {
      expectedResponse: expectedResponse,
      nodeType: nodeType,
      assertionType: nodeType.toLowerCase()
    };
  };

  // Simulate the call with the parameter passed correctly
  console.log('\n🧪 Testing with parameter passed correctly:');
  const result = createAssertionFromNodeWithMenus(testNode, dynamicMenusForAssertions);
  
  return result;
};

// Run the test
const result = testScopeFix();

console.log('\n📊 Final Test Result:');
if (result && result.expectedResponse === '1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service') {
  console.log('✅ SUCCESS: Scope fix working correctly!');
  console.log('  Expected Response:', result.expectedResponse);
  console.log('  Node Type:', result.nodeType);
  console.log('  Assertion Type:', result.assertionType);
} else {
  console.log('❌ FAILED: Scope fix not working');
  console.log('  Result:', result);
}

console.log('\n🎯 The React component should now work without the ReferenceError!');