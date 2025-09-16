# Dynamic Menu Connection Examples

## Example 1: Bill Payment Flow with Dynamic Biller List

### Flow Architecture
```
START → Static Menu → Action Node (Get Billers) → Dynamic Menu → Next Nodes
```

### 1. Action Node Configuration
**Node ID:** `get_billers_action`
**API Template:**
```json
{
  "_id": "get_billers_template",
  "target": {
    "endpoint": "https://api.payments.com/billers",
    "method": "GET"
  }
}
```
**Store Response As:** `billerListResponse`

### 2. API Response Example
```json
{
  "status": "success",
  "data": [
    {
      "id": "MTN_MM",
      "name": "MTN Mobile Money",
      "type": "mobile_money",
      "requiresAccount": false
    },
    {
      "id": "ECG_POWER",
      "name": "ECG Electricity",
      "type": "utility",
      "requiresAccount": true
    },
    {
      "id": "AIRTEL_MONEY",
      "name": "Airtel Money", 
      "type": "mobile_money",
      "requiresAccount": false
    },
    {
      "id": "GWCL_WATER",
      "name": "GWCL Water Bills",
      "type": "utility",
      "requiresAccount": true
    }
  ]
}
```

### 3. Dynamic Menu Configuration
**Node ID:** `dynamic_biller_menu`

#### Data Source Configuration:
```json
{
  "dataSource": {
    "type": "session",
    "sessionVariable": "billerListResponse",
    "responseKey": "data",
    "nameField": "name",
    "idField": "id"
  }
}
```

#### Routing Strategy - Conditional (Based on Requirements):
```json
{
  "routingStrategy": {
    "type": "conditional",
    "conditionalRules": [
      {
        "condition": "item.requiresAccount === true",
        "targetNode": "account_number_input"
      },
      {
        "condition": "item.requiresAccount === false",
        "targetNode": "phone_number_input"
      }
    ],
    "defaultTarget": "amount_input"
  }
}
```

### 4. Generated Menu
```
Select Biller:
1. MTN Mobile Money
2. ECG Electricity
3. Airtel Money
4. GWCL Water Bills

Enter your choice:
```

### 5. Connection Results
- **User selects "1" (MTN)** → Routes to `phone_number_input` (mobile money)
- **User selects "2" (ECG)** → Routes to `account_number_input` (utility with account)
- **User selects "3" (Airtel)** → Routes to `phone_number_input` (mobile money)
- **User selects "4" (GWCL)** → Routes to `account_number_input` (utility with account)

---

## Example 2: Single Target - All Options Go to Same Node

### Scenario: All billers need amount input first

#### Routing Strategy - Single Target:
```json
{
  "routingStrategy": {
    "type": "single",
    "singleTarget": "amount_input_node"
  }
}
```

### Connection Results
- **Any selection (1, 2, 3, 4)** → All route to `amount_input_node`
- Selected biller details stored in session for later use

---

## Example 3: Fixed Mapping - Specific Options to Specific Nodes

### Scenario: First few options have special handling

#### Routing Strategy - Fixed Mapping:
```json
{
  "routingStrategy": {
    "type": "fixed",
    "fixedMapping": {
      "1": "premium_biller_flow",
      "2": "premium_biller_flow", 
      "3": "standard_biller_flow",
      "4": "standard_biller_flow"
    }
  }
}
```

### Connection Results
- **Options 1-2** → Route to `premium_biller_flow`
- **Options 3-4** → Route to `standard_biller_flow`
- **Option 5+** → Route to fallback node

---

## Example 4: Complex Conditional Routing

### API Response with Categories
```json
{
  "data": [
    {"id": "MTN", "name": "MTN Mobile", "category": "telecom", "subtype": "mobile_money"},
    {"id": "ECG", "name": "ECG Electric", "category": "utility", "subtype": "electricity"},
    {"id": "DSTV", "name": "DSTV Subscription", "category": "entertainment", "subtype": "tv"},
    {"id": "WATER", "name": "Water Bills", "category": "utility", "subtype": "water"}
  ]
}
```

### Advanced Conditional Routing:
```json
{
  "routingStrategy": {
    "type": "conditional",
    "conditionalRules": [
      {
        "condition": "item.category === 'telecom'",
        "targetNode": "telecom_payment_flow"
      },
      {
        "condition": "item.category === 'utility' && item.subtype === 'electricity'",
        "targetNode": "electricity_meter_input"
      },
      {
        "condition": "item.category === 'utility' && item.subtype === 'water'", 
        "targetNode": "water_account_input"
      },
      {
        "condition": "item.category === 'entertainment'",
        "targetNode": "subscription_details_input"
      }
    ],
    "defaultTarget": "general_payment_flow"
  }
}
```

### Generated Menu & Routing:
```
Select Service:
1. MTN Mobile        → telecom_payment_flow
2. ECG Electric      → electricity_meter_input  
3. DSTV Subscription → subscription_details_input
4. Water Bills       → water_account_input
```

---

## How to Set Up Connections in Editor

### Step 1: Create the Flow
1. **START node** → **Static Menu node**
2. **Static Menu** → **Action node** (for API call)
3. **Action node** → **Dynamic Menu node**
4. **Dynamic Menu** → **Multiple target nodes**

### Step 2: Configure Action Node
1. Double-click Action node
2. Add API template for getting biller list
3. Configure where to store response (session variable name)
4. Connect success (200) output to Dynamic Menu node

### Step 3: Configure Dynamic Menu Node
1. Double-click Dynamic Menu node
2. Set **Data Source Type** to "Session Variable"
3. Enter **Session Variable Name** from Action node
4. Configure **Response Key**, **Name Field**, **ID Field**
5. Choose **Routing Strategy**:
   - **Single**: All options → same node
   - **Conditional**: Route based on item properties
   - **Fixed**: Specific option numbers → specific nodes

### Step 4: Create Target Nodes
Create the nodes that Dynamic Menu will route to:
- `amount_input_node`
- `account_number_input`
- `phone_number_input`
- etc.

### Step 5: Visual Connections (Optional)
You can create visual connections from Dynamic Menu to target nodes for documentation, but the actual routing is controlled by the Routing Strategy configuration.

---

## NiFi Implementation Example

### Processing Dynamic Menu Selection
```javascript
function processDynamicMenuSelection(userInput, dynamicMenuNode, sessionData) {
  // 1. Get the menu items from session
  const menuItems = getSessionMenuItems(dynamicMenuNode.dataSource);
  
  // 2. Validate user input
  const selectedIndex = parseInt(userInput) - 1;
  if (selectedIndex < 0 || selectedIndex >= menuItems.length) {
    return dynamicMenuNode.fallback;
  }
  
  // 3. Get selected item
  const selectedItem = menuItems[selectedIndex];
  
  // 4. Store selected item in session
  session.setAttribute("selectedBiller", selectedItem);
  session.setAttribute("selectedBillerId", selectedItem.id);
  session.setAttribute("selectedBillerName", selectedItem.name);
  
  // 5. Determine next node based on routing strategy
  return determineNextNode(selectedItem, dynamicMenuNode.routingStrategy);
}

function determineNextNode(selectedItem, routingStrategy) {
  switch (routingStrategy.type) {
    case 'single':
      return routingStrategy.singleTarget;
      
    case 'conditional':
      for (const rule of routingStrategy.conditionalRules) {
        if (evaluateCondition(rule.condition, selectedItem)) {
          return rule.targetNode;
        }
      }
      return routingStrategy.defaultTarget;
      
    case 'fixed':
      const optionNumber = getCurrentOptionNumber();
      return routingStrategy.fixedMapping[optionNumber] || routingStrategy.defaultTarget;
  }
}

function evaluateCondition(condition, item) {
  // Safe evaluation of conditions like "item.type === 'mobile_money'"
  // Replace 'item.' with actual item properties
  const evaluationCode = condition.replace(/item\./g, '');
  return eval(`item.${evaluationCode}`);
}
```

This way, your dynamic menu can have any number of options (1, 2, 3, 4, 5... up to 20) and each can route to the appropriate next node based on your business logic!