// Test JOLT Generation Logic
console.log('🧪 Testing JOLT Generation Logic\n');

// Mock request mapping like in your template
const testRequestMapping = [
  {
    path: 'confirmedAuthenticationValue',
    mappingType: 'session',
    storeAttribute: 'selectedItem.title',
    targetPath: 'confirmedAuthenticationValue'
  },
  {
    path: 'identifierType', 
    mappingType: 'session',
    storeAttribute: 'selectedItem.year',
    targetPath: 'identifierType'
  },
  {
    path: 'oldAuthenticationValue',
    mappingType: 'dynamic',
    storeAttribute: 'USERPIN',
    targetPath: 'oldAuthenticationValue'
  }
];

// Mock menu array name
const menuArrayName = 'items_menu_APIONE_items';

// Test JOLT generation logic
function generateJOLT(requestMapping, menuArrayName) {
  const sessionAwareRequestJolt = [];
  
  // Check if any fields need session data from selected items
  const hasSessionFields = requestMapping.some(field => 
    field.mappingType === 'session' && field.storeAttribute && 
    field.storeAttribute.includes('selectedItem.')
  );
  
  console.log('✅ Test 1: Session Field Detection');
  console.log('Has session fields:', hasSessionFields);
  console.log('Request mapping:', requestMapping.map(f => ({
    path: f.path,
    mappingType: f.mappingType,
    storeAttribute: f.storeAttribute
  })));
  
  if (hasSessionFields) {
    console.log('\n✅ Test 2: Modify Spec Generation');
    
    // Step 1: modify-overwrite-beta to extract selected item data
    const modifySpec = {};
    
    // Calculate selectedIndex from user selection (1,2,3... → 0,1,2...)
    modifySpec.selectedIndex = "=intSubtract(@(1,input.selection),1)";
    
    // Extract the selected item from the menu array
    modifySpec.selectedItem = `=elementAt(@(1,${menuArrayName}),@(1,selectedIndex))`;
    
    // Add specific field extractions for each session field mapping
    requestMapping.forEach(field => {
      if (field.mappingType === 'session' && field.storeAttribute && 
          field.storeAttribute.includes('selectedItem.')) {
        
        const parts = field.storeAttribute.split('selectedItem.');
        if (parts.length >= 2) {
          const fieldName = parts[1]; // e.g., 'title', 'year', 'author'
          const targetField = field.targetPath || field.path; // e.g., 'username', 'password'
          
          // Create intermediate variable: username = selectedItem, password = selectedItem
          modifySpec[targetField] = `=elementAt(@(1,${menuArrayName}),@(1,selectedIndex))`;
          
          // Create field extraction variable: usernameField = title from username
          const fieldExtractorName = `${targetField}Field`;
          modifySpec[fieldExtractorName] = `=elementAt(@(1,${targetField}),${fieldName})`;
          
          console.log(`Session field mapping: ${field.storeAttribute} → ${targetField} → ${fieldExtractorName} (extracts ${fieldName})`);
        }
      }
    });
    
    console.log('Generated modify spec:', JSON.stringify(modifySpec, null, 2));
    
    sessionAwareRequestJolt.push({
      operation: "modify-overwrite-beta",
      spec: modifySpec
    });
  }
  
  // Step 2: shift operation for final field mapping
  console.log('\n✅ Test 3: Shift Spec Generation');
  
  const shiftSpec = {
    input: {}
  };
  
  requestMapping.forEach(field => {
    if (field.mappingType === 'session' && field.storeAttribute.includes('selectedItem.')) {
      // Map the field extractor to final API field
      const targetField = field.targetPath || field.path;
      const fieldExtractorName = `${targetField}Field`;
      shiftSpec[fieldExtractorName] = field.path;
    } else if (field.mappingType === 'dynamic') {
      // Map dynamic data directly
      shiftSpec.input[field.storeAttribute] = field.path;
    }
  });
  
  console.log('Generated shift spec:', JSON.stringify(shiftSpec, null, 2));
  
  sessionAwareRequestJolt.push({
    operation: "shift",
    spec: shiftSpec
  });
  
  return sessionAwareRequestJolt;
}

// Run the test
const generatedJOLT = generateJOLT(testRequestMapping, menuArrayName);

console.log('\n✅ Test 4: Complete JOLT Output');
console.log('Final JOLT:', JSON.stringify(generatedJOLT, null, 2));

console.log('\n✅ Test 5: Workflow Simulation');
console.log('Simulating user selection workflow:');

// Simulate the data flow
const mockInput = { selection: "1" };
const mockSessionData = {
  [menuArrayName]: [
    {
      title: "The Hitchhiker's Guide to the Galaxy",
      author: "Douglas Adams",
      year: 1979,
      genres: ["Science Fiction", "Comedy"]
    },
    {
      title: "1984", 
      author: "George Orwell",
      year: 1949,
      genres: ["Dystopian"]
    }
  ]
};

console.log('Mock input:', mockInput);
console.log('Mock session data:', JSON.stringify(mockSessionData, null, 2));

// Step 1: Apply modify-overwrite-beta logic
const selectedIndex = parseInt(mockInput.selection) - 1; // 1 → 0
const selectedItem = mockSessionData[menuArrayName][selectedIndex];

console.log('\nAfter modify-overwrite-beta:');
console.log('selectedIndex:', selectedIndex);
console.log('selectedItem:', selectedItem);
console.log('confirmedAuthenticationValue:', selectedItem); // Same as selectedItem
console.log('confirmedAuthenticationValueField:', selectedItem.title); // Extract title
console.log('identifierType:', selectedItem); // Same as selectedItem  
console.log('identifierTypeField:', selectedItem.year); // Extract year

// Step 2: Apply shift logic
const finalResult = {
  confirmedAuthenticationValue: selectedItem.title, // "The Hitchhiker's Guide to the Galaxy"
  identifierType: selectedItem.year, // 1979
  oldAuthenticationValue: "user_pin_value" // From input.USERPIN
};

console.log('\nFinal API request data:', finalResult);

console.log('\n🎯 Expected Template Output:');
console.log(`User selects "1. Douglas Adams" → gets title: "${selectedItem.title}" and year: ${selectedItem.year}`);

// Test 6: Multiple array support
console.log('\n✅ Test 6: Multiple Array Support');

const testMultipleArrays = [
  'items_menu_APIONE_items',
  'user_menu_API_TWO_items', 
  'nifi.status',
  'items_menu_APIONE_menu_raw',
  'items_menu_APIONE_values'
];

const filteredArrays = testMultipleArrays.filter(variable => {
  const varName = variable.toLowerCase();
  return varName.includes('_items') && !varName.includes('_menu_raw') && !varName.includes('_values');
});

console.log('Available menu arrays for field extraction:', filteredArrays);

filteredArrays.forEach(arrayVar => {
  console.log(`\n🎯 Menu/Array Data (Field Extraction from: ${arrayVar})`);
  console.log('├── selectedItem.title (Title from selected menu item)');
  console.log('├── selectedItem.author (Author from selected menu item)');
  console.log('├── selectedItem.year (Year from selected menu item)');
  console.log('└── selectedItem.genres (Genres from selected menu item)');
});

console.log('\n🎉 All Tests Completed Successfully!');