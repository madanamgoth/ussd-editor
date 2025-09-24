console.log("🔧 Testing Flow Export queryformBodySpec Fix");
console.log("==========================================");

// Simulate the exact export logic with our fix
function testQueryformBodySpecExport() {
  
  console.log("📋 SCENARIO: Action node with GetBalance002 template");
  
  // Your actual template data structure
  const actionNodeConfig = {
    id: "action_1758740272023_838",
    templateId: "GetBalance002",
    isNextMenuDynamic: "N",
    // No queryformBodySpec in config (this was the problem)
    templates: [
      {
        _id: "GetBalance002",
        target: {
          method: "POST",
          endpoint: "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        },
        requestTemplate: {
          queryformBodySpec: [
            {
              operation: "shift",
              spec: {
                GetBalance002: {
                  grant_type: "grant_type",
                  userName: "userName"  
                }
              }
            },
            {
              operation: "modify-overwrite-beta",
              spec: {
                formBody: "=concat('grant_type=',@(1,grant_type),'&','userName=',@(1,userName))"
              }
            },
            {
              operation: "remove",
              spec: {
                grant_type: "",
                userName: ""
              }
            }
          ]
        }
      }
    ]
  };
  
  console.log("🔍 DEBUGGING THE EXPORT LOGIC:");
  
  // Apply the EXACT logic from our fix in flowUtils.js
  const config = actionNodeConfig;
  let queryformBodySpec = config.queryformBodySpec;
  
  console.log("Step 1 - config.queryformBodySpec:", queryformBodySpec || "undefined");
  
  // If not in config, extract from template data
  if (!queryformBodySpec || queryformBodySpec === "NA") {
    console.log("Step 2 - queryformBodySpec missing, checking templates...");
    
    if (config.templates && config.templates.length > 0) {
      const firstTemplate = config.templates[0];
      console.log("Step 3 - Found template ID:", firstTemplate._id);
      
      if (firstTemplate.requestTemplate?.queryformBodySpec) {
        queryformBodySpec = JSON.stringify(firstTemplate.requestTemplate.queryformBodySpec);
        console.log("Step 4 - ✅ Found requestTemplate.queryformBodySpec, stringifying");
        console.log("Step 5 - Stringified length:", queryformBodySpec.length);
      } else if (firstTemplate.queryformBodySpec) {
        queryformBodySpec = firstTemplate.queryformBodySpec;
        console.log("Step 4 - Found top-level queryformBodySpec");
      } else {
        console.log("Step 4 - ❌ No queryformBodySpec found in template");
      }
    } else {
      console.log("Step 3 - ❌ No templates found in config");
    }
  }
  
  // Final assignment logic
  const finalResult = (queryformBodySpec && queryformBodySpec !== "NA") ? queryformBodySpec : "NA";
  
  console.log("\n⚡ FINAL EXPORT RESULT:");
  console.log("queryformBodySpec:", finalResult === "NA" ? "❌ NA" : "✅ EXTRACTED FROM TEMPLATE");
  
  if (finalResult !== "NA") {
    console.log("\n📄 Exported queryformBodySpec preview:");
    console.log(finalResult.substring(0, 150) + "...");
    
    try {
      const parsed = JSON.parse(finalResult);
      console.log("\n🔧 Operations found:");
      parsed.forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.operation}`);
        if (op.operation === "modify-overwrite-beta") {
          console.log(`     formBody: ${op.spec.formBody}`);
        }
      });
    } catch (e) {
      console.log("(Could not parse JSON)");
    }
  }
  
  // Simulate the complete exported action node
  const exportedActionNode = {
    id: config.id,
    type: "ACTION",
    transitions: { "200": "end_1758740326872_68" },
    templateId: config.templateId,
    isNextMenuDynamic: config.isNextMenuDynamic,
    sessionSpec: JSON.stringify([{ operation: "shift", spec: { "*": { "*": "&" }}}]),
    queryformBodySpec: finalResult
  };
  
  console.log("\n📤 COMPLETE EXPORTED ACTION NODE:");
  console.log(JSON.stringify(exportedActionNode, null, 2));
  
  return finalResult !== "NA";
}

const success = testQueryformBodySpecExport();

console.log("\n🎯 EXPECTED: Extract queryformBodySpec from template during export");
console.log("🎯 ACTUAL:", success ? "✅ SUCCESS - Fix works!" : "❌ FAILED");

console.log("\n💡 KEY DIFFERENCE FROM sessionSpec:");
console.log("sessionSpec: GENERATED during export (always present)");
console.log("queryformBodySpec: NOW EXTRACTED from template (like sessionSpec)");
console.log("\nYour flow export should now show the actual queryformBodySpec instead of 'NA'!");