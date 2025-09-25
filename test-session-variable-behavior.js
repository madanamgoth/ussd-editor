/**
 * Test to verify Session Variable Name behavior
 * This matches the exact UI behavior from Template Creator
 */

console.log('Testing Session Variable Name Input Behavior...\n');

// Simulate array detection and recommendation generation
const generateSmartSessionName = (arrayPath) => {
  const commonMappings = {
    'data': 'items_menu',
    'items': 'items_menu', 
    'products': 'products_menu',
    'books': 'books_menu',
    'fiction': 'fiction_menu',
    'classics': 'classics_menu',
    'accounts': 'accounts_menu',
    'users': 'users_menu',
    'categories': 'categories_menu'
  };
  
  const cleanPath = arrayPath.toLowerCase().replace(/\./g, '_');
  
  if (commonMappings[cleanPath]) {
    return commonMappings[cleanPath];
  }
  
  const pathParts = cleanPath.split('_');
  const meaningfulPart = pathParts[pathParts.length - 1];
  
  if (commonMappings[meaningfulPart]) {
    return commonMappings[meaningfulPart];
  }
  
  return `${cleanPath}_menu`;
};

// Simulate detected arrays from user's API response
const detectedArrays = [
  { path: 'fiction', type: 'objects', sampleKeys: ['bookTitle', 'bookAuthor', 'year'] },
  { path: 'classics', type: 'objects', sampleKeys: ['bookTitle', 'bookAuthor', 'year'] }
];

// Generate recommendations (as Template Creator does)
const recommendations = detectedArrays.map(arr => {
  const sessionVar = generateSmartSessionName(arr.path);
  console.log(`🎯 Array path: "${arr.path}" -> sessionVariable: "${sessionVar}"`);
  return {
    path: arr.path,
    type: arr.type,
    suggested: {
      sessionVariable: sessionVar,
      displayKey: arr.type === 'objects' ? arr.sampleKeys[1] || arr.sampleKeys[0] : null,
      valueKey: arr.type === 'objects' ? arr.sampleKeys[0] : 'index'
    }
  };
});

console.log('\n=== Array Recommendations ===');
recommendations.forEach((rec, index) => {
  console.log(`Array #${index + 1}: ${rec.path}`);
  console.log(`  Suggested Session Variable: ${rec.suggested.sessionVariable}`);
  console.log(`  Display Key: ${rec.suggested.displayKey}`);
  console.log(`  Value Key: ${rec.suggested.valueKey}`);
});

// Test array selection scenarios
const testScenarios = [
  {
    name: 'User selects fiction array (index 0)',
    selectedIndex: 0,
    userCustomName: '' // User doesn't change the session variable name
  },
  {
    name: 'User selects classics array (index 1)', 
    selectedIndex: 1,
    userCustomName: '' // User doesn't change the session variable name
  },
  {
    name: 'User selects classics array and customizes name',
    selectedIndex: 1,
    userCustomName: 'my_classics_menu' // User types custom name
  }
];

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  
  const selectedRec = recommendations[scenario.selectedIndex];
  
  // Simulate array selection (what happens when user clicks radio button)
  let selectedArrayConfig = {
    selectedArray: scenario.selectedIndex,
    displayKey: selectedRec.suggested.displayKey || '',
    valueKey: selectedRec.suggested.valueKey || '',
    sessionVariable: selectedRec.suggested.sessionVariable,
    customSessionName: ''
  };
  
  console.log('After array selection:', selectedArrayConfig);
  
  // Simulate user typing in Session Variable Name field
  if (scenario.userCustomName) {
    selectedArrayConfig.customSessionName = scenario.userCustomName;
    console.log('After user types custom name:', selectedArrayConfig);
  }
  
  // What should the input field display?
  const inputFieldValue = selectedArrayConfig.customSessionName || selectedArrayConfig.sessionVariable;
  console.log(`Input field should show: "${inputFieldValue}"`);
  
  // What should be used in sessionSpec?
  let menuArrayName;
  if (selectedArrayConfig.customSessionName) {
    menuArrayName = selectedArrayConfig.customSessionName;
    console.log(`✅ SessionSpec should use customSessionName: "${menuArrayName}"`);
  } else if (selectedArrayConfig.sessionVariable) {
    menuArrayName = selectedArrayConfig.sessionVariable;
    console.log(`✅ SessionSpec should use sessionVariable: "${menuArrayName}"`);
  } else {
    menuArrayName = 'dynamic_menu_items';
    console.log(`⚠️ SessionSpec should use fallback: "${menuArrayName}"`);
  }
});

console.log('\n=== Expected Behavior ===');
console.log('1. When user selects fiction array:');
console.log('   - Input field shows: "fiction_menu"'); 
console.log('   - SessionSpec uses: "fiction_menu"');
console.log('');
console.log('2. When user selects classics array:');
console.log('   - Input field shows: "classics_menu"');
console.log('   - SessionSpec uses: "classics_menu"'); 
console.log('');
console.log('3. When user types custom name:');
console.log('   - Input field shows: "my_custom_name"');
console.log('   - SessionSpec uses: "my_custom_name"');

console.log('\n🔍 If sessionSpec shows "fiction_menu" when user selected classics:');
console.log('   - Check browser console for array selection logs');
console.log('   - Verify selectedArrayConfig state');
console.log('   - Check if state is being reset somewhere');