// Test output for system-token curl command with template name wrapping
// 
// Input curl:
// curl --location --request GET \
// 'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials' \
// --header 'Content-Type: application/x-www-form-urlencoded' \
// --header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \
// --header 'SkipSecurityHeaderValidation: true' \
// --header 'SkipPayloadEncryption: true' \
// --header 'X-Channel: WEB'

// Expected output when template ID = "SYSTEM_TOKEN" and grant_type is set to "static":

const expectedJoltOutput = [
  {
    "_id": "SYSTEM_TOKEN",
    "target": {
      "endpoint": "http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token",
      "method": "GET",
      "headers": {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic Q29yZVdlYjphZGF5ZmNTV2NJ",
        "SkipSecurityHeaderValidation": "true",
        "SkipPayloadEncryption": "true",
        "X-Channel": "WEB"
      }
    },
    "requestTemplate": {
      "joltSpec": [
        {
          "operation": "shift",
          "spec": {
            "input": {
              // Any other dynamic fields would go here
              // Query parameters with static mapping won't appear in shift spec
            }
          }
        },
        {
          "operation": "default",
          "spec": {
            // Static query parameter with template name wrapping
            "SYSTEM_TOKEN.grant_type": "client_credentials"
          }
        }
      ]
    },
    "responseTemplate": {
      "joltSpec": [
        {
          "operation": "shift",
          "spec": {
            "input": {
              "access_token": "systemToken",
              "token_type": "tokenType",
              "expires_in": "expiresIn"
            }
          }
        },
        {
          "operation": "default",
          "spec": {
            "success": true,
            "timestamp": "2025-09-24T08:10:54.262Z",
            "status": "SUCCEEDED"
          }
        }
      ]
    },
    "responseErrorTemplate": {
      "joltSpec": [
        {
          "operation": "shift",
          "spec": {
            "input": {
              "error": "authError",
              "error_description": "errorDescription"
            }
          }
        },
        {
          "operation": "default",
          "spec": {
            "success": false,
            "error": true,
            "timestamp": "2025-09-24T08:08:57.940Z",
            "status": "FAILED",
            "errorCode": "AUTH_ERROR",
            "errorMessage": "Authentication failed"
          }
        }
      ]
    }
  }
];

// If grant_type was set to "dynamic" instead:
const dynamicExample = {
  "requestTemplate": {
    "joltSpec": [
      {
        "operation": "shift",
        "spec": {
          "input": {
            // Dynamic query parameter with template name wrapping
            "grant_type": "SYSTEM_TOKEN.grant_type"
          }
        }
      },
      {
        "operation": "default",
        "spec": {
          // Static defaults would go here
        }
      }
    ]
  }
};

console.log('✅ Expected JOLT structure for system-token API');
console.log('📋 Template wrapped query params:', 'SYSTEM_TOKEN.grant_type');
console.log('🔗 Static query param goes to default spec');
console.log('🔄 Dynamic query param goes to shift spec with template wrapping');