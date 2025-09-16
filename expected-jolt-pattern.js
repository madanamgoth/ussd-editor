// Test the corrected JOLT generation
// Expected correct JOLT pattern for session-aware template

const expectedCorrectJOLT = {
  "requestTemplate": {
    "joltSpec": [
      // Step 1: Calculate selectedIndex and extract selectedItem
      {
        "operation": "modify-overwrite-beta",
        "spec": {
          "selectedIndex": "=intSubtract(@(1,input.selection),1)",
          "selectedItem": "=elementAt(@(1,items_menu_BOOK_items),@(1,selectedIndex))"
        }
      },
      // Step 2: Map fields from selectedItem and input to target locations
      {
        "operation": "shift",
        "spec": {
          "input": {
            "USERPIN": "requestType",
            "nifi": {
              "status": "userInformation.workspaceInformation.categoryCode"
            }
          },
          "selectedItem": {
            "author": "profileDetails.authProfile",
            "year": "userInformation.basicInformation.emailId",
            "rating": "userInformation.basicInformation.loginIdentifiers[0].type"
          }
        }
      },
      // Step 3: Add default static values
      {
        "operation": "default",
        "spec": {
          "userInformation": {
            "basicInformation": {
              "loginIdentifiers[0]": {
                "value": "amgothmadanID"
              },
              "notificationIdentifiers[0]": {
                "type": "EMAILID",
                "value": "madan1@comviva.com"
              },
              "allowedDays": "1,2,3,4",
              "allowedFromTime": "10:00",
              "allowedToTime": "18:20",
              "dateOfEmployment": "1990-10-12",
              "firstName": "Alaina",
              "lastName": "CustomerCare Admin",
              "middleName": "Kumar",
              "preferredLanguage": "en",
              "remarks": "Demo Registration"
            }
          }
        }
      }
    ]
  }
};

// Test input data
const testInput = {
  "input": {
    "selection": "2",
    "USERPIN": "1234",
    "nifi": {"status": "SUCCESS"}
  },
  "items_menu_BOOK_items": [
    {"title": "Book1", "author": "Author1", "year": 2020, "rating": 4.5},
    {"title": "Book2", "author": "Author2", "year": 2021, "rating": 4.8}
  ]
};

// Expected output after JOLT transformation
const expectedOutput = {
  "requestType": "1234",
  "profileDetails": {
    "authProfile": "Author2"  // selectedItem.author from second book
  },
  "userInformation": {
    "basicInformation": {
      "emailId": 2021,  // selectedItem.year from second book
      "loginIdentifiers[0]": {
        "type": 4.8,  // selectedItem.rating from second book
        "value": "amgothmadanID"
      }
      // ... other default fields
    },
    "workspaceInformation": {
      "categoryCode": "SUCCESS"  // input.nifi.status
    }
  }
};

console.log("✅ Fixed JOLT generation should produce this pattern");
console.log("🎯 Key improvement: Direct mapping from selectedItem.field to target location");
console.log("❌ No more complex intermediate field extractors");