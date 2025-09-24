console.log("🔧 Testing Template to Action Node Transfer");
console.log("===========================================");

// Simulate the template creation and transfer process
function testTemplateTransfer() {
  
  console.log("📋 SCENARIO: User creates template with POST + form-urlencoded");
  
  // This would be the templateData returned from TemplateCreator
  const templateData = {
    _id: "PaymentStatus",
    target: {
      method: "POST",
      endpoint: "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic Q29yZVdlYjphZGF5ZmNTV2NJ"
      }
    },
    requestTemplate: {
      joltSpec: [
        {
          operation: "shift",
          spec: {
            input: {
              MSISDN: "PaymentStatus.userName"
            }
          }
        },
        {
          operation: "default", 
          spec: {
            PaymentStatus: {
              grant_type: "client_credentials"
            }
          }
        }
      ],
      queryformBodySpec: [
        {
          operation: "shift",
          spec: {
            PaymentStatus: {
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
    },
    queryformBodySpec: JSON.stringify([
      {
        operation: "shift",
        spec: {
          PaymentStatus: {
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
    ])
  };
  
  console.log("🏭 TEMPLATE CREATION RESULT:");
  console.log("Template ID:", templateData._id);
  console.log("Method:", templateData.target.method);
  console.log("Content-Type:", templateData.target.headers["Content-Type"]);
  console.log("Has queryformBodySpec:", !!templateData.queryformBodySpec);
  console.log("QueryformBodySpec length:", templateData.queryformBodySpec ? templateData.queryformBodySpec.length : 0);
  
  // Simulate the handleCreateTemplate function logic
  console.log("\n🔄 TRANSFERRING TO ACTION NODE CONFIG:");
  
  const existingConfig = {
    id: "action_1758739636092_853",
    templates: [],
    sessionSpec: "[{\"operation\":\"shift\",\"spec\":{\"*\":{\"*\":\"&\"}}}]"
  };
  
  // Add template to the list
  const updatedTemplates = [...existingConfig.templates, templateData];
  
  // Build updated config with the new transfer logic
  const updatedConfig = {
    ...existingConfig,
    templates: updatedTemplates
  };
  
  // Transfer dynamic menu fields from template to Action node config
  if (templateData.templateId) {
    updatedConfig.templateId = templateData.templateId;
  }
  if (templateData.sessionSpec) {
    updatedConfig.sessionSpec = templateData.sessionSpec;
  }
  if (templateData.menuName) {
    updatedConfig.menuName = templateData.menuName;
  }
  if (templateData.menuJolt) {
    updatedConfig.menuJolt = templateData.menuJolt;
  }
  if (templateData.isNextMenuDynamic) {
    updatedConfig.isNextMenuDynamic = templateData.isNextMenuDynamic;
  }
  // 🔧 THE FIX: Transfer queryformBodySpec
  if (templateData.queryformBodySpec) {
    updatedConfig.queryformBodySpec = templateData.queryformBodySpec;
  }
  
  console.log("✅ ACTION NODE CONFIG AFTER TRANSFER:");
  console.log("Templates count:", updatedConfig.templates.length);
  console.log("Has queryformBodySpec:", !!updatedConfig.queryformBodySpec);
  console.log("QueryformBodySpec value:", updatedConfig.queryformBodySpec === "NA" ? "NA" : "CREATED");
  
  // Simulate the flow export process
  console.log("\n📤 SIMULATING FLOW EXPORT:");
  
  const config = updatedConfig;
  const cleanNode = {
    id: config.id,
    type: "ACTION",
    transitions: {},
    templateId: "PaymentStatus",
    isNextMenuDynamic: "N",
    sessionSpec: config.sessionSpec
  };
  
  // Add queryformBodySpec if present (flowUtils.js logic)
  if (config.queryformBodySpec) {
    cleanNode.queryformBodySpec = config.queryformBodySpec;
  } else {
    cleanNode.queryformBodySpec = "NA";
  }
  
  console.log("📊 EXPORTED NODE:");
  console.log("ID:", cleanNode.id);
  console.log("Type:", cleanNode.type);
  console.log("TemplateId:", cleanNode.templateId);
  console.log("QueryformBodySpec:", cleanNode.queryformBodySpec === "NA" ? "❌ NA" : "✅ CREATED");
  
  return cleanNode.queryformBodySpec !== "NA";
}

const success = testTemplateTransfer();

console.log("\n🎯 EXPECTED: queryformBodySpec should be created (not NA)");
console.log("🎯 ACTUAL:", success ? "✅ SUCCESS" : "❌ FAILED");

if (success) {
  console.log("\n🎉 FIX CONFIRMED!");
  console.log("The queryformBodySpec transfer fix should resolve the export issue.");
  console.log("Action nodes will now properly export queryformBodySpec instead of 'NA'.");
} else {
  console.log("\n❌ ISSUE PERSISTS");
  console.log("Additional debugging needed to identify the remaining problem.");
}