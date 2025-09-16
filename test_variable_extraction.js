// Test the variable extraction logic
const testTemplate = {
  responseTemplate: {
    joltSpec: [
      {
        operation: 'shift',
        spec: {
          'status': 'nifi.status',
          'data[*]': 'items_menu_APIONE_items[&1]',
          'data[*].author': 'items_menu_APIONE_menu_raw[&1]',
          'data[*].title': 'items_menu_APIONE_values[&1]',
          'data': 'items_menu_APIONE'
        }
      }
    ]
  }
};

const variables = [];
const extractVariableNames = (spec) => {
  Object.entries(spec).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const varName = value.replace(/\[.*?\]/g, '');
      if (varName && !variables.includes(varName)) {
        variables.push(varName);
      }
    } else if (typeof value === 'object' && value !== null) {
      extractVariableNames(value);
    }
  });
};

testTemplate.responseTemplate.joltSpec.forEach(joltOperation => {
  if (joltOperation.operation === 'shift' && joltOperation.spec) {
    extractVariableNames(joltOperation.spec);
  }
});

console.log('✅ Test 1: Basic Variable Extraction');
console.log('Extracted variables:', variables);
console.log('Expected: nifi.status, items_menu_APIONE_items, items_menu_APIONE_menu_raw, items_menu_APIONE_values, items_menu_APIONE');

// Test 2: Multiple API templates
console.log('\n✅ Test 2: Multiple API Templates');
const testTemplate2 = {
  responseTemplate: {
    joltSpec: [
      {
        operation: 'shift',
        spec: {
          'users[*]': 'user_menu_API_TWO_items[&1]',
          'users[*].name': 'user_menu_API_TWO_menu_raw[&1]',
          'users[*].id': 'user_menu_API_TWO_values[&1]',
          'status': 'api2.status'
        }
      }
    ]
  }
};

const variables2 = [];
const extractVariableNames2 = (spec) => {
  Object.entries(spec).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const varName = value.replace(/\[.*?\]/g, '');
      if (varName && !variables2.includes(varName)) {
        variables2.push(varName);
      }
    } else if (typeof value === 'object' && value !== null) {
      extractVariableNames2(value);
    }
  });
};

testTemplate2.responseTemplate.joltSpec.forEach(joltOperation => {
  if (joltOperation.operation === 'shift' && joltOperation.spec) {
    extractVariableNames2(joltOperation.spec);
  }
});

console.log('Template 2 variables:', variables2);
console.log('All variables combined:', [...new Set([...variables, ...variables2])]);

// Test 3: Field extraction filtering
console.log('\n✅ Test 3: Field Extraction Filtering');
const allVariables = [...new Set([...variables, ...variables2])];

// Test the filtering logic from TemplateCreator
const menuArrayVariables = allVariables.filter(variable => {
  const varName = variable.toLowerCase();
  return varName.includes('_items') && !varName.includes('_menu_raw') && !varName.includes('_values');
});

console.log('Menu array variables (for field extraction):', menuArrayVariables);

const cleanSessionVariables = allVariables.filter(variable => {
  const varName = variable.toLowerCase();
  // Exclude user input variables
  if (['amount', 'pin', 'userinput', 'selection', 'user_input', 'username'].includes(varName)) {
    return false;
  }
  // Exclude menu raw and values
  if (varName.includes('_menu_raw') || varName.includes('_values')) {
    return false;
  }
  return true;
});

console.log('Clean session variables (for dropdown):', cleanSessionVariables);

console.log('\n✅ Test 4: Expected Dropdown Structure');
menuArrayVariables.forEach(arrayVar => {
  console.log(`🎯 Menu/Array Data (Field Extraction from: ${arrayVar})`);
  console.log('├── selectedItem.title (Title from selected menu item)');
  console.log('├── selectedItem.author (Author from selected menu item)');
  console.log('├── selectedItem.year (Year from selected menu item)');
  console.log('└── selectedItem.genres (Genres from selected menu item)');
});

console.log('\n📋 Available Session Variables');
cleanSessionVariables.forEach(variable => {
  console.log(`├── ${variable} (From action node template data)`);
});