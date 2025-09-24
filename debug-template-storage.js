console.log("🔍 Debugging Template Storage and Action Node Config");
console.log("==================================================");

// This script would be run in the browser console to check the actual state
function debugTemplateIssue() {
  
  console.log("📋 CHECKING LOCALSTORAGE TEMPLATES:");
  
  // Check localStorage templates
  const storageKey = 'ussd-api-templates';
  let savedTemplates = [];
  
  try {
    savedTemplates = JSON.parse(localStorage.getItem(storageKey) || '[]');
    console.log(`Found ${savedTemplates.length} templates in localStorage`);
    
    savedTemplates.forEach((template, index) => {
      console.log(`\n🔗 Template ${index + 1}:`);
      console.log(`  ID: ${template._id}`);
      console.log(`  Method: ${template.target?.method}`);
      console.log(`  Content-Type: ${template.target?.headers?.['Content-Type']}`);
      console.log(`  Has requestTemplate.queryformBodySpec: ${!!template.requestTemplate?.queryformBodySpec}`);
      console.log(`  RequestTemplate queryformBodySpec type: ${typeof template.requestTemplate?.queryformBodySpec}`);
      console.log(`  Has top-level queryformBodySpec: ${!!template.queryformBodySpec}`);
      console.log(`  Top-level queryformBodySpec type: ${typeof template.queryformBodySpec}`);
      
      if (template._id === 'PaymentStatus0002' || template._id === 'PaymentStatus') {
        console.log(`\n🎯 FOUND TARGET TEMPLATE: ${template._id}`);
        console.log(`  Full template:`, template);
        
        if (template.requestTemplate?.queryformBodySpec) {
          console.log(`  RequestTemplate queryformBodySpec:`, template.requestTemplate.queryformBodySpec);
        }
        if (template.queryformBodySpec) {
          console.log(`  Top-level queryformBodySpec:`, template.queryformBodySpec);
        }
      }
    });
  } catch (error) {
    console.error('❌ Error reading localStorage:', error);
  }
  
  console.log("\n🔧 POTENTIAL ISSUES TO CHECK:");
  console.log("1. Template created before our fix - needs recreation");
  console.log("2. Template has queryformBodySpec but action node config doesn't");
  console.log("3. Template selection not transferring queryformBodySpec properly");
  console.log("4. Flow export not reading from config.templates[0].queryformBodySpec");
  
  console.log("\n💡 SOLUTIONS TO TRY:");
  console.log("1. Delete and recreate the PaymentStatus template with the fixed logic");
  console.log("2. Check that action node config has templates array with queryformBodySpec");
  console.log("3. Verify handleCreateTemplate is transferring queryformBodySpec properly");
  
  console.log("\n🧪 MANUAL TEST STEPS:");
  console.log("1. Open browser dev tools");
  console.log("2. Run: JSON.parse(localStorage.getItem('ussd-api-templates'))");
  console.log("3. Look for PaymentStatus0002 and check if it has queryformBodySpec");
  console.log("4. If missing, delete template and recreate with your curl command");
}

debugTemplateIssue();

console.log("\n🚨 CRITICAL INSIGHT:");
console.log("The action node has templateId: 'PaymentStatus0002' but queryformBodySpec: 'NA'");
console.log("This means either:");
console.log("  A) The template PaymentStatus0002 doesn't have queryformBodySpec");
console.log("  B) The template isn't being loaded into action node config properly");
console.log("  C) The template was created before our fix");

console.log("\n🔧 IMMEDIATE ACTION:");
console.log("1. Check if PaymentStatus0002 template has queryformBodySpec in localStorage");
console.log("2. If not, delete and recreate the template using your curl command");
console.log("3. Ensure the new template gets properly added to action node config");
console.log("4. Re-export the flow to see if queryformBodySpec appears");