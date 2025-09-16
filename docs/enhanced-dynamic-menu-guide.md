# Enhanced Dynamic Menu - Response Parsing & Dynamic Routing

## Advanced Response Parsing

The enhanced `dataSource` configuration can handle complex API responses with nested data, filtering, and sorting.

### Supported Response Formats

#### 1. Simple Array Response
```json
[
  {"id": "MTN", "name": "MTN Mobile Money"},
  {"id": "AIRTEL", "name": "Airtel Money"}
]
```
**Configuration:**
- Response Key: `""` (empty for root array)
- Name Field: `name`
- ID Field: `id`

#### 2. Nested Object Response
```json
{
  "status": "success",
  "result": {
    "billers": [
      {"code": "MTN_MM", "title": "MTN Mobile Money", "type": "mobile"},
      {"code": "ECG_POWER", "title": "ECG Electricity", "type": "utility"}
    ]
  }
}
```
**Configuration:**
- Response Key: `result.billers`
- Name Field: `title`
- ID Field: `code`

#### 3. Complex Nested Response
```json
{
  "data": {
    "services": [
      {
        "details": {
          "id": "MTN001",
          "info": {
            "displayName": "MTN Mobile Money"
          }
        },
        "metadata": {
          "status": "active",
          "priority": 1
        }
      }
    ]
  }
}
```
**Configuration:**
- Response Key: `data.services`
- Name Field: `details.info.displayName`
- ID Field: `details.id`
- Filter Field: `metadata.status`
- Filter Value: `active`
- Sort By: `metadata.priority`

### Advanced Parsing Options

#### Filtering
```javascript
// Only include items where status is "active"
filterField: "status"
filterValue: "active"

// Only include mobile money services
filterField: "type"
filterValue: "mobile_money"
```

#### Sorting
```javascript
// Sort by name alphabetically
sortBy: "name"
sortOrder: "asc"

// Sort by priority (highest first)
sortBy: "priority"
sortOrder: "desc"
```

## Dynamic Routing Strategies

Since dynamic menus can have varying numbers of options, we need flexible routing strategies.

### 1. Single Target Routing
**Use Case:** All menu options lead to the same next node (e.g., amount input)

```json
{
  "routingStrategy": {
    "type": "single",
    "singleTarget": "amount_input_node"
  }
}
```

**Example Flow:**
```
Dynamic Biller Menu:
1. MTN Mobile Money    }
2. Airtel Money        } → All go to Amount Input Node
3. ECG Electricity     }
4. Water Bills         }
```

**NiFi Processing:**
```javascript
// All selections go to same node
const selectedItem = getSelectedItem(userInput);
session.setAttribute("selectedBiller", selectedItem);
return "amount_input_node";
```

### 2. Conditional Routing
**Use Case:** Route based on item properties (type, category, etc.)

```json
{
  "routingStrategy": {
    "type": "conditional",
    "conditionalRules": [
      {
        "condition": "item.type === 'mobile_money'",
        "targetNode": "mobile_money_flow"
      },
      {
        "condition": "item.type === 'utility'",
        "targetNode": "utility_flow"
      }
    ],
    "defaultTarget": "general_payment_flow"
  }
}
```

**Example Flow:**
```
Dynamic Biller Menu:
1. MTN Mobile Money (type: mobile_money) → Mobile Money Flow
2. Airtel Money (type: mobile_money)    → Mobile Money Flow
3. ECG Electricity (type: utility)      → Utility Flow
4. Water Bills (type: utility)          → Utility Flow
```

**NiFi Processing:**
```javascript
const selectedItem = getSelectedItem(userInput);
const rules = node.routingStrategy.conditionalRules;

for (const rule of rules) {
  if (evaluateCondition(rule.condition, selectedItem)) {
    return rule.targetNode;
  }
}
return node.routingStrategy.defaultTarget;
```

### 3. Fixed Mapping Routing
**Use Case:** Specific option numbers always go to specific nodes

```json
{
  "routingStrategy": {
    "type": "fixed",
    "fixedMapping": {
      "1": "quick_pay_node",
      "2": "bill_inquiry_node",
      "3": "account_management_node"
    }
  }
}
```

## Complete Implementation Example

### API Response
```json
{
  "status": "success",
  "data": {
    "billers": [
      {
        "id": "MTN001",
        "name": "MTN Mobile Money",
        "type": "mobile_money",
        "status": "active",
        "priority": 1
      },
      {
        "id": "AIRTEL002", 
        "name": "Airtel Money",
        "type": "mobile_money",
        "status": "active",
        "priority": 2
      },
      {
        "id": "ECG003",
        "name": "ECG Electricity",
        "type": "utility",
        "status": "active",
        "priority": 3
      },
      {
        "id": "WATER004",
        "name": "GWCL Water",
        "type": "utility", 
        "status": "inactive",
        "priority": 4
      }
    ]
  }
}
```

### Dynamic Menu Configuration
```json
{
  "dataSource": {
    "type": "session",
    "sessionVariable": "billerResponse",
    "responseKey": "data.billers",
    "nameField": "name",
    "idField": "id",
    "filterField": "status",
    "filterValue": "active",
    "sortBy": "priority",
    "sortOrder": "asc"
  },
  "routingStrategy": {
    "type": "conditional",
    "conditionalRules": [
      {
        "condition": "item.type === 'mobile_money'",
        "targetNode": "mobile_money_amount"
      },
      {
        "condition": "item.type === 'utility'", 
        "targetNode": "utility_account_input"
      }
    ],
    "defaultTarget": "general_payment"
  }
}
```

### Generated Menu
```
Select Biller:
1. MTN Mobile Money
2. Airtel Money  
3. ECG Electricity

Enter your choice:
```
*(Note: GWCL Water filtered out due to inactive status)*

### User Selection Results
**User selects "1" (MTN Mobile Money):**
- Routes to: `mobile_money_amount` (based on type condition)
- Session variables created:
  - `selectedBiller`: Full MTN object
  - `selectedBillerId`: "MTN001"
  - `selectedBillerName`: "MTN Mobile Money"

**User selects "3" (ECG Electricity):**
- Routes to: `utility_account_input` (based on type condition)
- Session variables created:
  - `selectedBiller`: Full ECG object
  - `selectedBillerId`: "ECG003"
  - `selectedBillerName`: "ECG Electricity"

## NiFi Implementation Guide

### Data Processing Function
```javascript
function processSessionData(sessionVariable, config) {
  const rawData = session.getAttribute(sessionVariable);
  let items = getNestedProperty(rawData, config.responseKey);
  
  // Apply filtering
  if (config.filterField && config.filterValue) {
    items = items.filter(item => 
      getNestedProperty(item, config.filterField) === config.filterValue
    );
  }
  
  // Apply sorting
  if (config.sortBy) {
    items.sort((a, b) => {
      const aVal = getNestedProperty(a, config.sortBy);
      const bVal = getNestedProperty(b, config.sortBy);
      const order = config.sortOrder === 'desc' ? -1 : 1;
      return aVal > bVal ? order : -order;
    });
  }
  
  return items;
}
```

### Routing Logic
```javascript
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
      return routingStrategy.fixedMapping[userSelection] || fallbackNode;
      
    default:
      return fallbackNode;
  }
}
```

This enhanced system provides maximum flexibility for handling any API response format and routing dynamic menu selections appropriately.