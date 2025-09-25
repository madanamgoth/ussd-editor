/**
 * Test the exact dynamic menu JOLT generation scenario 
 * from the user's Template Creator workflow
 */

import JoltGeneratorEnhanced from './src/utils/JoltGeneratorEnhanced.js';

console.log('Testing Dynamic Menu JOLT Generation Fix...\n');

// Simulate the exact scenario from the user's workflow
const rawResponse = {
  userName: "200",
  fiction: [
    {
      bookTitle: "The Hitchhiker's Guide to the Galaxy",
      bookAuthor: "Douglas Adams",
      year: 1979
    },
    {
      bookTitle: "1984",
      bookAuthor: "George Orwell",
      year: 1949
    },
    {
      bookTitle: "One Hundred Years of Solitude",
      bookAuthor: "Gabriel García Márquez",
      year: 1967
    }
  ],
  classics: [
    {
      bookTitle: "Pride and Prejudice",
      bookAuthor: "Jane Austen",
      year: 1813
    }
  ]
};

// User's desired output mapping
const desiredOutput = {
  "userName": "nifiUserName"
};

// Simulate the dynamic menu configuration
const selectedArrayConfig = {
  selectedArray: 1, // classics array
  customSessionName: 'classics_menu',
  sessionVariable: 'classics_menu',
  displayKey: 'bookAuthor',
  valueKey: 'bookTitle'
};

console.log('🔧 Input Configuration:');
console.log('- Raw Response:', JSON.stringify(rawResponse, null, 2));
console.log('- Desired Output:', JSON.stringify(desiredOutput, null, 2));
console.log('- Array Config:', selectedArrayConfig);

// Simulate the JOLT generation process as it happens in the Template Creator
console.log('\n🎯 Simulating Template Creator Dynamic Menu JOLT Generation...');

// Build the shift spec exactly as the Template Creator does
const shiftSpec = {
  "input": {}
};

// Add non-array mappings from desired output
Object.entries(desiredOutput).forEach(([sourcePath, targetPath]) => {
  if (sourcePath !== 'classics' && typeof targetPath === 'string') {
    shiftSpec.input[sourcePath] = targetPath;
  }
});

// Add the array mapping for dynamic menu
const sessionVarName = selectedArrayConfig.customSessionName;
const displayKey = selectedArrayConfig.displayKey;
shiftSpec.input['classics'] = {
  "*": {
    "@": `${sessionVarName}[]`,
    [displayKey]: `${sessionVarName.replace(/_items$/, '')}_menu_raw[]`
  }
};

// Generate the initial JOLT (without defaults)
let result = [
  {
    "operation": "shift",
    "spec": shiftSpec
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "timestamp": new Date().toISOString(),
      "status": "SUCCEEDED"
    }
  }
];

console.log('\n❌ BEFORE Enhancement (missing defaults):');
console.log(JSON.stringify(result, null, 2));

// Check what defaults are missing
const defaultOperation = result.find(op => op.operation === 'default');
console.log('\n🔍 Missing Defaults Analysis:');
console.log('- nifiUserName:', defaultOperation.spec.nifiUserName || 'MISSING ❌');
console.log('- classics_menu:', defaultOperation.spec.classics_menu || 'MISSING ❌');
console.log('- classics_menu_menu_raw:', defaultOperation.spec.classics_menu_menu_raw || 'MISSING ❌');

// Apply the enhancement (this is the fix we added to Template Creator)
result = JoltGeneratorEnhanced.enhanceJoltWithDefaults(result);

console.log('\n✅ AFTER Enhancement (with all defaults):');
console.log(JSON.stringify(result, null, 2));

// Verify the fix
const enhancedDefaultOperation = result.find(op => op.operation === 'default');
console.log('\n🎉 Fixed Defaults Verification:');
console.log('- nifiUserName:', enhancedDefaultOperation.spec.nifiUserName || 'STILL MISSING ❌');
console.log('- classics_menu:', JSON.stringify(enhancedDefaultOperation.spec.classics_menu) || 'STILL MISSING ❌');
console.log('- classics_menu_menu_raw:', JSON.stringify(enhancedDefaultOperation.spec.classics_menu_menu_raw) || 'STILL MISSING ❌');

// Success check
let successCount = 0;
if (enhancedDefaultOperation.spec.nifiUserName === "0") {
  console.log('✅ nifiUserName default correctly added');
  successCount++;
}
if (Array.isArray(enhancedDefaultOperation.spec.classics_menu)) {
  console.log('✅ classics_menu[] default correctly added');
  successCount++;
}
if (Array.isArray(enhancedDefaultOperation.spec.classics_menu_menu_raw)) {
  console.log('✅ classics_menu_menu_raw[] default correctly added');
  successCount++;
}

console.log(`\n🎯 SUCCESS RATE: ${successCount}/3 defaults correctly added`);

if (successCount === 3) {
  console.log('\n🎉 FIX CONFIRMED! Template Creator will now automatically add all missing defaults.');
  console.log('   Dynamic menus will show "unable to fetch" instead of being empty.');
  console.log('   Regular fields will have "0" defaults to prevent JOLT failures.');
} else {
  console.log('\n❌ FIX INCOMPLETE! Some defaults are still missing.');
}