## SOLUTION: How to Fix the PASSWORD Field Issue

### Problem Identified:
- URL parsing works correctly (extracts `grant_type` and `userId`)  
- Expected JOLT should map: `userId` → `Template.userId`
- But actual result shows: `PASSWORD` → `Template.PASSWORD`
- Issue is in React component state, not curl parsing

### Fix Steps:

#### Step 1: Clear Browser State
1. Open browser dev tools (F12)
2. Go to Application tab → Storage → Clear storage 
3. OR hard refresh: Ctrl+Shift+R
4. OR open incognito/private window

#### Step 2: Test with Debug Logs
1. Open http://localhost:5173/
2. Open Console tab in dev tools
3. Paste this EXACT curl command:

```bash
curl --location --request GET \
'http://172.25.48.177:9999/jigsaw/ums/v1/user/auth/web/system-token?grant_type=client_credentials&userId=madan' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic Q29yZVdlYjphZGF5ZmNTV2NJ' \
--header 'SkipSecurityHeaderValidation: true' \
--header 'SkipPayloadEncryption: true' \
--header 'X-Channel: WEB'
```

4. Click "Parse cURL" button
5. Look for console logs:
   - `🐛 DEBUG: Starting fresh curl parsing - clearing previous state`
   - `🐛 DEBUG: Setting requestMapping with X fields`
   - Field extraction logs showing `userId` and `grant_type`

#### Step 3: Check Step 2 Field Mapping
In Step 2 of the UI, you should see:
- ✅ `grant_type` field with value `client_credentials`
- ✅ `userId` field with value `madan`  
- ❌ NO `PASSWORD` field should appear

If PASSWORD field still appears:
- It's being added manually or by some UI interaction
- Check if you accidentally added it in previous step
- Look for any auto-complete or pre-filled fields

#### Step 4: Generate JOLT Correctly
When you generate JOLT specs, it should produce:
```json
{
  "operation": "shift",
  "spec": {
    "grant_type": "Template.grant_type",
    "userId": "Template.userId"
  }
}
```

### If Problem Persists:
Add this manual override in the generateJoltSpecs function to filter out PASSWORD:

```javascript
// Filter out any PASSWORD fields that shouldn't be there
const filteredFields = requestMapping.filter(field => 
  field.storeAttribute !== 'PASSWORD'
);
```

### Expected Final Result:
```json
{
  "operation": "shift",
  "spec": {
    "grant_type": "Template.grant_type", 
    "userId": "Template.userId"
  }
}
```