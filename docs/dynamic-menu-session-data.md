# Dynamic Menu with Session Data - Implementation Guide

## Updated Architecture

The Dynamic Menu now supports **two data source modes**:

1. **Session Data** (Recommended) - Uses data from previous Action node
2. **Direct API Call** - Makes its own API call (original approach)

## Session Data Mode (Your Use Case)

### Flow Architecture
```
START → Static Menu → Action Node (API Call) → Dynamic Menu (Session Data) → Next Node
```

### How It Works

1. **Action Node** calls your API and stores response in session variable
2. **Dynamic Menu Node** reads from the session variable (no additional API call)
3. **Menu Generation** happens using the stored data
4. **User Selection** routes to appropriate next node

### Configuration Example

#### Action Node Configuration
```json
{
  "type": "ACTION",
  "templates": [
    {
      "_id": "get_billers",
      "target": {
        "endpoint": "https://api.billers.com/list",
        "method": "GET"
      }
    }
  ],
  "storeResponseAs": "billerListResponse"
}
```

#### Dynamic Menu Node Configuration
```json
{
  "type": "DYNAMIC-MENU",
  "dataSource": {
    "type": "session",
    "sessionVariable": "billerListResponse",
    "responseKey": "data",
    "nameField": "name", 
    "idField": "id"
  },
  "menuMapping": {
    "1": "amount_input_node",
    "2": "account_number_node"
  }
}
```

### Sample API Response (stored in session)
```json
{
  "status": "success",
  "data": [
    {
      "id": "MTN_MM",
      "name": "MTN Mobile Money",
      "type": "mobile_money"
    },
    {
      "id": "ECG_POWER", 
      "name": "ECG Electricity",
      "type": "utility"
    }
  ]
}
```

### Generated Menu
```
Select Biller:
1. MTN Mobile Money
2. ECG Electricity

Enter your choice:
```

## Configuration Steps

### 1. Configure Action Node
1. Set up API template to call your biller/service API
2. Configure where to store the response (session variable name)
3. Connect Action node to Dynamic Menu node

### 2. Configure Dynamic Menu Node
1. Set **Data Source Type** to "Session Variable"
2. Enter **Session Variable Name** (same as Action node stores)
3. Set **Data Path** (e.g., "data" if response is `{data: [...]}`)
4. Configure **Name Field** and **ID Field** for menu generation
5. Set up **Menu Mapping** for routing user selections

### 3. NiFi Processing Logic

#### Action Node Processing
```javascript
// Make API call
const response = await fetch(apiEndpoint);
const data = await response.json();

// Store in session
session.setAttribute("billerListResponse", data);

// Route to next node based on response code
if (response.status === 200) {
  return "dynamic_menu_node_id";
} else {
  return "error_node_id";
}
```

#### Dynamic Menu Processing
```javascript
// Get data from session
const sessionData = session.getAttribute("billerListResponse");
const menuItems = getNestedProperty(sessionData, "data"); // Using responseKey

// Generate menu
let menuText = "Select Biller:\n";
menuItems.forEach((item, index) => {
  menuText += `${index + 1}. ${item.name}\n`;
});

// Store menu mapping in session for user response processing
const menuMapping = {};
menuItems.forEach((item, index) => {
  menuMapping[index + 1] = item;
});
session.setAttribute("currentMenuMapping", menuMapping);

// Send menu to user
return menuText;
```

#### User Response Processing
```javascript
const userInput = parseInt(userResponse);
const menuMapping = session.getAttribute("currentMenuMapping");
const selectedItem = menuMapping[userInput];

if (selectedItem) {
  // Store selected item details
  session.setAttribute("selectedBiller", selectedItem);
  session.setAttribute("selectedBillerId", selectedItem.id);
  session.setAttribute("selectedBillerName", selectedItem.name);
  
  // Route based on configuration
  return getNextNodeForOption(userInput);
} else {
  return "fallback_node_id";
}
```

## Benefits of Session Data Approach

1. **Performance** - No additional API calls in Dynamic Menu
2. **Consistency** - Data is already validated by Action node
3. **Error Handling** - API errors handled once in Action node
4. **Caching** - Data available throughout user session
5. **Complex Logic** - Action node can pre-process/filter data

## Migration from Direct API Calls

If you have existing Dynamic Menu nodes with direct API calls:

1. Add an Action node before the Dynamic Menu
2. Move API configuration from Dynamic Menu to Action node
3. Configure Dynamic Menu to use session data
4. Update NiFi processors accordingly

## Complete Flow Example

### USSD Flow Design
```
START
  ↓
Static Menu: "1. Send Money, 2. Bill Payment"
  ↓ (user selects 2)
Action Node: GET /api/billers → stores in "billerList"
  ↓ (200 response)
Dynamic Menu: reads from "billerList" session variable
  ↓ (user selects option)
Amount Input Node
  ↓
Payment Processing
  ↓
END
```

### Session Variables Created
- `billerList` - Full API response from Action node
- `selectedBiller` - User's selected biller object
- `selectedBillerId` - ID of selected biller
- `selectedBillerName` - Name of selected biller
- `currentMenuMapping` - Mapping of options to data

This approach gives you maximum flexibility while maintaining performance and consistency in your USSD flows.