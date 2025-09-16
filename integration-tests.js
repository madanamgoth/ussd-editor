/**
 * Integration Test for JOLT Generation Logic
 * This script will test the actual JOLT generation in the browser
 */

// Test runner that can be executed in browser console
const runIntegrationTests = () => {
  console.log("🧪 Running Integration Tests for JOLT Generation Logic...\n");
  
  // Test Case 1: Basic Session-Aware Template
  console.log("🧪 Test 1: Basic Session-Aware Template");
  console.log("-".repeat(40));
  
  const testData1 = {
    requestMapping: [
      { 
        mappingType: 'dynamic', 
        storeAttribute: 'USERPIN', 
        targetPath: 'requestType',
        path: 'requestType'
      },
      { 
        mappingType: 'session', 
        storeAttribute: 'selectedItem.author', 
        targetPath: 'profileDetails.authProfile',
        path: 'profileDetails.authProfile'
      },
      { 
        mappingType: 'session', 
        storeAttribute: 'selectedItem.year', 
        targetPath: 'userInformation.basicInformation.emailId',
        path: 'userInformation.basicInformation.emailId'
      }
    ],
    menuArrayName: 'items_menu_BOOK_items',
    staticFields: {},
    hasSessionFields: true
  };
  
  // Expected correct JOLT structure
  const expectedJOLT1 = [
    {
      operation: "modify-overwrite-beta",
      spec: {
        selectedIndex: "=intSubtract(@(1,input.selection),1)",
        selectedItem: "=elementAt(@(1,items_menu_BOOK_items),@(1,selectedIndex))"
      }
    },
    {
      operation: "shift",
      spec: {
        input: {
          USERPIN: "requestType"
        },
        selectedItem: {
          author: "profileDetails.authProfile",
          year: "userInformation.basicInformation.emailId"
        }
      }
    },
    {
      operation: "default",
      spec: {}
    }
  ];
  
  console.log("Expected JOLT:", JSON.stringify(expectedJOLT1, null, 2));
  
  // Test Case 2: Complex Real-World Scenario
  console.log("\n🧪 Test 2: Complex Real-World Scenario");
  console.log("-".repeat(40));
  
  const testData2 = {
    requestMapping: [
      { mappingType: 'dynamic', storeAttribute: 'USERPIN', targetPath: 'auth.pin' },
      { mappingType: 'dynamic', storeAttribute: 'AMOUNT', targetPath: 'transaction.amount' },
      { mappingType: 'session', storeAttribute: 'selectedItem.title', targetPath: 'product.name' },
      { mappingType: 'session', storeAttribute: 'selectedItem.price', targetPath: 'transaction.productPrice' },
      { mappingType: 'session', storeAttribute: 'nifi.status', targetPath: 'system.status' },
      { mappingType: 'static', staticValue: 'PURCHASE', targetPath: 'transaction.type' }
    ],
    menuArrayName: 'items_menu_PRODUCTS_items',
    staticFields: { 'api.version': 'v1.0' },
    hasSessionFields: true
  };
  
  // Test Case 3: No Session Fields (Dynamic Only)
  console.log("\n🧪 Test 3: Dynamic Fields Only");
  console.log("-".repeat(40));
  
  const testData3 = {
    requestMapping: [
      { mappingType: 'dynamic', storeAttribute: 'USERPIN', targetPath: 'pin' },
      { mappingType: 'dynamic', storeAttribute: 'AMOUNT', targetPath: 'amount' },
      { mappingType: 'static', staticValue: 'TEST', targetPath: 'mode' }
    ],
    menuArrayName: null,
    staticFields: {},
    hasSessionFields: false
  };
  
  const expectedJOLT3 = [
    {
      operation: "shift",
      spec: {
        input: {
          USERPIN: "pin",
          AMOUNT: "amount"
        }
      }
    },
    {
      operation: "default",
      spec: {
        mode: "TEST"
      }
    }
  ];
  
  console.log("Expected JOLT (No Session):", JSON.stringify(expectedJOLT3, null, 2));
  
  // Test Case 4: Validation Helper Functions
  const validateJOLTOperation = (jolt, operationType, expectedSpec) => {
    const operation = jolt.find(op => op.operation === operationType);
    if (!operation) {
      return { valid: false, reason: `Missing ${operationType} operation` };
    }
    
    // Basic structure validation
    if (!operation.spec) {
      return { valid: false, reason: `${operationType} missing spec` };
    }
    
    return { valid: true, operation };
  };
  
  const validateSessionAwareJOLT = (jolt) => {
    console.log("\n🔍 Validating Session-Aware JOLT...");
    
    // Check for correct operation sequence
    if (jolt.length !== 3) {
      console.log("❌ Should have exactly 3 operations");
      return false;
    }
    
    // Check modify-overwrite-beta
    const modifyOp = validateJOLTOperation(jolt, 'modify-overwrite-beta');
    if (!modifyOp.valid) {
      console.log("❌", modifyOp.reason);
      return false;
    }
    
    const modifySpec = modifyOp.operation.spec;
    if (!modifySpec.selectedIndex || !modifySpec.selectedItem) {
      console.log("❌ modify-overwrite-beta missing selectedIndex or selectedItem");
      return false;
    }
    
    if (modifySpec.selectedIndex !== "=intSubtract(@(1,input.selection),1)") {
      console.log("❌ Incorrect selectedIndex formula");
      return false;
    }
    
    if (!modifySpec.selectedItem.includes("=elementAt(")) {
      console.log("❌ Incorrect selectedItem formula");
      return false;
    }
    
    // Check shift operation
    const shiftOp = validateJOLTOperation(jolt, 'shift');
    if (!shiftOp.valid) {
      console.log("❌", shiftOp.reason);
      return false;
    }
    
    const shiftSpec = shiftOp.operation.spec;
    if (!shiftSpec.selectedItem) {
      console.log("❌ shift operation missing selectedItem section");
      return false;
    }
    
    // Check default operation
    const defaultOp = validateJOLTOperation(jolt, 'default');
    if (!defaultOp.valid) {
      console.log("❌", defaultOp.reason);
      return false;
    }
    
    console.log("✅ JOLT structure is valid!");
    return true;
  };
  
  const validateDynamicOnlyJOLT = (jolt) => {
    console.log("\n🔍 Validating Dynamic-Only JOLT...");
    
    // Should NOT have modify-overwrite-beta
    const hasModify = jolt.some(op => op.operation === 'modify-overwrite-beta');
    if (hasModify) {
      console.log("❌ Should not have modify-overwrite-beta for dynamic-only template");
      return false;
    }
    
    // Should have shift and default
    if (jolt.length !== 2) {
      console.log("❌ Should have exactly 2 operations (shift, default)");
      return false;
    }
    
    const shiftOp = validateJOLTOperation(jolt, 'shift');
    if (!shiftOp.valid || !shiftOp.operation.spec.input) {
      console.log("❌ shift operation missing or invalid input section");
      return false;
    }
    
    console.log("✅ Dynamic-only JOLT structure is valid!");
    return true;
  };
  
  // Manual test instructions
  console.log("\n🔧 MANUAL TESTING INSTRUCTIONS:");
  console.log("=".repeat(50));
  console.log("1. Open your USSD Editor application");
  console.log("2. Create a template with session fields (selectedItem.*)");
  console.log("3. Download the generated JOLT");
  console.log("4. Compare with expected patterns above");
  console.log("5. Verify in NiFi that the JOLT executes without errors");
  
  console.log("\n✅ VALIDATION CHECKLIST:");
  console.log("□ modify-overwrite-beta has only selectedIndex and selectedItem");
  console.log("□ shift operation maps selectedItem.field directly to target");
  console.log("□ No intermediate field extractors like 'fieldNameField'");
  console.log("□ Dynamic fields go to input section");
  console.log("□ Static fields go to default section");
  console.log("□ Templates without session fields skip modify-overwrite-beta");
  
  return {
    testData: [testData1, testData2, testData3],
    validators: {
      validateSessionAwareJOLT,
      validateDynamicOnlyJOLT,
      validateJOLTOperation
    }
  };
};

// Browser console helper
if (typeof window !== 'undefined') {
  window.runIntegrationTests = runIntegrationTests;
  console.log("🧪 Integration Test Suite loaded!");
  console.log("📋 Run runIntegrationTests() in console to see test cases");
  console.log("📋 Create templates and compare against expected patterns");
}

// Sample input/output for testing
const SAMPLE_TEST_DATA = {
  input: {
    selection: "2",
    USERPIN: "1234",
    AMOUNT: "100.50",
    nifi: { status: "SUCCESS" }
  },
  items_menu_BOOK_items: [
    { title: "Book1", author: "Author1", year: 2020, price: 15.99 },
    { title: "Book2", author: "Author2", year: 2021, price: 18.99 },
    { title: "Book3", author: "Author3", year: 2022, price: 22.99 }
  ]
};

const EXPECTED_OUTPUT = {
  requestType: "1234",
  auth: { pin: "1234" },
  transaction: { 
    amount: "100.50",
    productPrice: 18.99
  },
  product: { 
    name: "Book2",
    creator: "Author2" 
  },
  system: { status: "SUCCESS" }
};

export { runIntegrationTests, SAMPLE_TEST_DATA, EXPECTED_OUTPUT };