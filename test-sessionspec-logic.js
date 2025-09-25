/**
 * Test to debug the sessionSpec generation issue
 * Helps identify why fiction_menu is hardcoded instead of being dynamic
 */

console.log('Testing SessionSpec Generation Logic...\n');

// Simulate the generateSmartSessionName function from Template Creator
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
    'categories': 'categories_menu',
    'orders': 'orders_menu',
    'transactions': 'transactions_menu',
    'chapters': 'chapters_menu',
    'locations': 'locations_menu',
    'services': 'services_menu',
    'results': 'results_menu'
  };
  
  // Clean path and get meaningful name
  const cleanPath = arrayPath.toLowerCase().replace(/\./g, '_');
  
  // Check if we have a specific mapping
  if (commonMappings[cleanPath]) {
    return commonMappings[cleanPath];
  }
  
  // For nested paths like "response.data", use the last meaningful part
  const pathParts = cleanPath.split('_');
  const meaningfulPart = pathParts[pathParts.length - 1];
  
  if (commonMappings[meaningfulPart]) {
    return commonMappings[meaningfulPart];
  }
  
  // Default: use the path with _menu suffix
  return `${cleanPath}_menu`;
};

// Test different array configurations
const testConfigs = [
  {
    name: 'User Configured - classics with customSessionName',
    selectedArrayConfig: {
      selectedArray: 1,
      customSessionName: 'classics_menu',
      sessionVariable: 'classics_menu',
      displayKey: 'bookAuthor',
      valueKey: 'bookTitle'
    },
    expectedResult: 'classics_menu'
  },
  {
    name: 'User Configured - fiction array',
    selectedArrayConfig: {
      selectedArray: 0,
      customSessionName: '',
      sessionVariable: 'fiction_menu',
      displayKey: 'bookAuthor',
      valueKey: 'bookTitle'
    },
    expectedResult: 'fiction_menu'
  },
  {
    name: 'Auto-generated from array path - classics',
    selectedArrayConfig: {
      selectedArray: 1,
      customSessionName: '',
      sessionVariable: '',
      displayKey: 'bookAuthor',
      valueKey: 'bookTitle'
    },
    arrayPath: 'classics',
    expectedResult: 'classics_menu'
  },
  {
    name: 'Auto-generated from array path - fiction',
    selectedArrayConfig: {
      selectedArray: 0,
      customSessionName: '',
      sessionVariable: '',
      displayKey: 'bookAuthor',
      valueKey: 'bookTitle'
    },
    arrayPath: 'fiction',
    expectedResult: 'fiction_menu'
  }
];

testConfigs.forEach((testConfig, index) => {
  console.log(`\n${index + 1}. Testing: ${testConfig.name}`);
  console.log('Input:', JSON.stringify(testConfig.selectedArrayConfig, null, 2));
  
  // Simulate the logic from Template Creator
  let menuArrayName;
  if (testConfig.selectedArrayConfig.customSessionName) {
    menuArrayName = testConfig.selectedArrayConfig.customSessionName;
    console.log('✅ Using customSessionName:', menuArrayName);
  } else if (testConfig.selectedArrayConfig.sessionVariable) {
    menuArrayName = testConfig.selectedArrayConfig.sessionVariable;
    console.log('✅ Using sessionVariable:', menuArrayName);
  } else if (testConfig.arrayPath) {
    menuArrayName = generateSmartSessionName(testConfig.arrayPath);
    console.log('✅ Generated from array path:', menuArrayName);
  } else {
    menuArrayName = 'dynamic_menu_items';
    console.log('⚠️ Using fallback:', menuArrayName);
  }
  
  // Generate sample sessionSpec
  const templateId = 'TEST_TEMPLATE';
  const sessionSpec = [
    {
      "operation": "shift",
      "spec": {
        "*": {
          "*": "&"
        }
      }
    },
    {
      "operation": "shift", 
      "spec": {
        "*": "&",
        [menuArrayName]: {
          "*": {
            "@": `${templateId}.&`
          }
        }
      }
    },
    {
      "operation": "modify-overwrite-beta",
      "spec": {
        "currentNode": "@(1,latestCurrentNode)",
        [templateId]: "=recursivelySortKeys"
      }
    },
    {
      "operation": "remove",
      "spec": {
        [menuArrayName]: "",
        "latestCurrentNode": ""
      }
    }
  ];
  
  console.log('Generated menuArrayName:', menuArrayName);
  console.log('Expected:', testConfig.expectedResult);
  console.log('Match:', menuArrayName === testConfig.expectedResult ? '✅' : '❌');
  console.log('SessionSpec snippet:', JSON.stringify(sessionSpec[1].spec, null, 2));
});

console.log('\n=== Analysis ===');
console.log('The issue might be:');
console.log('1. selectedArrayConfig state not being updated properly');
console.log('2. customSessionName not being set when user configures array');
console.log('3. sessionVariable defaulting to old/cached values');
console.log('4. Logic precedence issue in menuArrayName determination');

console.log('\n=== Solution ===');
console.log('✅ Fixed Template Creator logic to prioritize customSessionName');
console.log('✅ Added debugging to track selectedArrayConfig state');
console.log('✅ Updated fallback to use generic name instead of hardcoded values');
console.log('Now sessionSpec should use the dynamic session variable name!');