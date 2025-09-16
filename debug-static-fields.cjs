#!/usr/bin/env node

/**
 * 🔍 JOLT Generation Debug - Static Field Analysis
 * Debug why static fields with nested paths aren't being counted correctly
 */

// Helper function from your code
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
}

// Your actual JOLT generation function
function generateSessionAwareJoltSpecs(requestMapping, menuArrayName) {
    console.log('🔍 DEBUG: Starting JOLT generation...');
    console.log('🔍 DEBUG: Request mapping:', requestMapping.length, 'fields');
    
    const sessionAwareRequestJolt = [];
    
    // Check if any fields need session data from selected items
    const hasSessionFields = requestMapping.some(field => 
        field.mappingType === 'session' && field.storeAttribute && 
        (field.storeAttribute.includes('selectedItem.') || field.storeAttribute.includes('_selectedItem.'))
    );
    
    console.log('🔍 DEBUG: Has session fields:', hasSessionFields);
    
    if (hasSessionFields) {
        // Step 1: modify-overwrite-beta to extract selected item data
        const modifySpec = {};
        
        // Calculate selectedIndex from user selection (1,2,3... → 0,1,2...)
        modifySpec.selectedIndex = "=intSubtract(@(1,input.selection),1)";
        
        // Extract the selected item from the menu array
        modifySpec.selectedItem = `=elementAt(@(1,${menuArrayName}),@(1,selectedIndex))`;
        
        sessionAwareRequestJolt.push({
            operation: "modify-overwrite-beta",
            spec: modifySpec
        });
    }
    
    // Step 2: shift operation for final field mapping
    const requestShiftSpec = {
        input: {}
    };
    const requestDefaultSpec = {};
    
    console.log('🔍 DEBUG: Processing fields...');
    
    requestMapping.forEach((field, index) => {
        console.log(`🔍 DEBUG: Field ${index + 1}: ${field.mappingType} - ${field.storeAttribute || field.staticValue} -> ${field.targetPath}`);
        
        if (field.mappingType === 'dynamic' && field.storeAttribute) {
            // Regular dynamic fields from input
            setNestedValue(requestShiftSpec.input, field.storeAttribute, field.targetPath || field.path);
            console.log(`  ✅ Dynamic: input.${field.storeAttribute} → ${field.targetPath || field.path}`);
        } else if (field.mappingType === 'session' && field.storeAttribute && 
                   field.storeAttribute.includes('selectedItem.')) {
            // Session fields from selected items - map directly from selectedItem
            const parts = field.storeAttribute.split('selectedItem.');
            if (parts.length >= 2) {
                const fieldName = parts[1]; // e.g., 'title', 'year', 'author'
                const targetPath = field.targetPath || field.path; // e.g., 'profileDetails.authProfile'
                
                // Map selectedItem.fieldName directly to target path
                setNestedValue(requestShiftSpec, `selectedItem.${fieldName}`, targetPath);
                console.log(`  ✅ Session: selectedItem.${fieldName} → ${targetPath}`);
            }
        } else if (field.mappingType === 'static') {
            // Static fields
            setNestedValue(requestDefaultSpec, field.targetPath || field.path, field.staticValue || field.value);
            console.log(`  ✅ Static: ${field.targetPath || field.path} = ${field.staticValue || field.value}`);
        }
    });
    
    console.log('🔍 DEBUG: Final requestDefaultSpec structure:');
    console.log(JSON.stringify(requestDefaultSpec, null, 2));
    
    sessionAwareRequestJolt.push({
        operation: "shift",
        spec: requestShiftSpec
    });
    
    sessionAwareRequestJolt.push({
        operation: "default",
        spec: requestDefaultSpec
    });
    
    console.log('🔍 DEBUG: Generated JOLT:', JSON.stringify(sessionAwareRequestJolt, null, 2));
    
    return sessionAwareRequestJolt;
}

// Test with a complex banking example
const testCase = {
    name: "🏢 Banking API Debug",
    requestMapping: [
        { mappingType: 'dynamic', storeAttribute: 'CUSTOMER_ID', targetPath: 'request.customer.identification.customerId' },
        { mappingType: 'dynamic', storeAttribute: 'PIN', targetPath: 'request.authentication.credentials.pin' },
        { mappingType: 'session', storeAttribute: 'selectedItem.accountNumber', targetPath: 'request.transaction.destination.account.number' },
        { mappingType: 'session', storeAttribute: 'selectedItem.bankCode', targetPath: 'request.transaction.destination.bank.code' },
        { mappingType: 'static', staticValue: 'INTER_BANK_TRANSFER', targetPath: 'request.transaction.type' },
        { mappingType: 'static', staticValue: 'USD', targetPath: 'request.transaction.details.amount.currency' },
        { mappingType: 'static', staticValue: 'HIGH', targetPath: 'request.transaction.priority' },
        { mappingType: 'static', staticValue: 'v2.1', targetPath: 'request.metadata.apiVersion' }
    ],
    menuArrayName: 'items_menu_BANK_ACCOUNTS_SEARCH_items'
};

console.log('🔍 DEBUG: Testing complex banking scenario...');
console.log('🔍 DEBUG: Static fields expected:');
testCase.requestMapping.filter(f => f.mappingType === 'static').forEach((field, i) => {
    console.log(`  ${i + 1}. ${field.targetPath} = ${field.staticValue}`);
});

const result = generateSessionAwareJoltSpecs(testCase.requestMapping, testCase.menuArrayName);

// Count actual static fields in the result
const defaultOp = result.find(op => op.operation === 'default');
function countNestedFields(obj, prefix = '') {
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            count += countNestedFields(value, currentPath);
        } else {
            count++;
            console.log(`🔍 Found static field: ${currentPath} = ${value}`);
        }
    }
    return count;
}

const actualStaticCount = countNestedFields(defaultOp.spec);
console.log(`🔍 DEBUG: Expected static fields: 4`);
console.log(`🔍 DEBUG: Actual static fields: ${actualStaticCount}`);