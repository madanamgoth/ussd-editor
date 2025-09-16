# Visual Connection Example

## Complete Flow Example: Bill Payment with Dynamic Biller Selection

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│    START    │───▶│  Static Menu    │───▶│  Action Node    │───▶│  Dynamic Menu    │
│             │    │ 1. Send Money   │    │ (Get Billers)   │    │  (Session Data)  │
│             │    │ 2. Pay Bills ◄──┤    │                 │    │                  │
└─────────────┘    └─────────────────┘    └─────────────────┘    └──────────────────┘
                                                                           │
                   ┌────────────────────────────────────────────────────────┘
                   │
                   ▼
         Dynamic Menu Shows:
         ┌─────────────────────┐
         │ Select Biller:      │
         │ 1. MTN Mobile Money │ ───┐
         │ 2. ECG Electricity  │ ───┼─── Conditional Routing
         │ 3. Airtel Money     │ ───┤
         │ 4. GWCL Water       │ ───┘
         └─────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────────┐
    │        Routing Decision                 │
    │                                         │
    │ IF item.type === 'mobile_money'         │
    │ THEN → Phone Number Input               │
    │                                         │
    │ IF item.type === 'utility'              │
    │ THEN → Account Number Input             │
    │                                         │
    │ DEFAULT → Amount Input                  │
    └─────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Phone     │ │  Account    │ │   Amount    │
│  Number     │ │  Number     │ │   Input     │
│   Input     │ │   Input     │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Session Data Flow

### 1. Action Node Stores API Response
```javascript
// Action node calls API and stores result
session.setAttribute("billerListResponse", {
  "status": "success", 
  "data": [
    {"id": "MTN", "name": "MTN Mobile Money", "type": "mobile_money"},
    {"id": "ECG", "name": "ECG Electricity", "type": "utility"},
    {"id": "AIRTEL", "name": "Airtel Money", "type": "mobile_money"},
    {"id": "GWCL", "name": "GWCL Water", "type": "utility"}
  ]
});
```

### 2. Dynamic Menu Reads Session & Generates Menu
```javascript
// Dynamic menu node reads from session
const billerData = session.getAttribute("billerListResponse");
const billers = billerData.data;

// Generates numbered menu
let menu = "Select Biller:\n";
billers.forEach((biller, index) => {
  menu += `${index + 1}. ${biller.name}\n`;
});
// Result: "1. MTN Mobile Money\n2. ECG Electricity\n3. Airtel Money\n4. GWCL Water"
```

### 3. User Selection & Routing
```javascript
// User enters "1" (MTN Mobile Money)
const userChoice = 1;
const selectedBiller = billers[userChoice - 1]; // MTN object

// Store selected biller details
session.setAttribute("selectedBiller", selectedBiller);
session.setAttribute("selectedBillerId", "MTN");
session.setAttribute("selectedBillerName", "MTN Mobile Money");

// Apply routing strategy
const routingStrategy = {
  "type": "conditional",
  "conditionalRules": [
    {
      "condition": "item.type === 'mobile_money'",
      "targetNode": "phone_number_input"
    },
    {
      "condition": "item.type === 'utility'", 
      "targetNode": "account_number_input"
    }
  ]
};

// Since selectedBiller.type === 'mobile_money'
// Route to: phone_number_input
```

## Different Routing Examples

### Example 1: All Go to Same Node (Single Target)
```
Dynamic Menu (Any Selection) → Amount Input Node
```
**Configuration:**
```json
{
  "routingStrategy": {
    "type": "single",
    "singleTarget": "amount_input_node"
  }
}
```

### Example 2: Based on Item Properties (Conditional)
```
Mobile Money Billers → Phone Number Input
Utility Billers → Account Number Input
```
**Configuration:**
```json
{
  "routingStrategy": {
    "type": "conditional",
    "conditionalRules": [
      {"condition": "item.type === 'mobile_money'", "targetNode": "phone_input"},
      {"condition": "item.type === 'utility'", "targetNode": "account_input"}
    ]
  }
}
```

### Example 3: Specific Option Numbers (Fixed)
```
Option 1 → Premium Flow
Option 2-3 → Standard Flow
Option 4+ → Basic Flow
```
**Configuration:**
```json
{
  "routingStrategy": {
    "type": "fixed",
    "fixedMapping": {
      "1": "premium_flow",
      "2": "standard_flow", 
      "3": "standard_flow",
      "4": "basic_flow"
    }
  }
}
```

## Key Benefits

1. **Dynamic Options**: Menu can have 1, 5, 10, or 20 options - routing adapts automatically
2. **Smart Routing**: Route based on data properties, not just option numbers
3. **Session Persistence**: Selected item data available throughout the user journey
4. **Flexible Configuration**: Handle any API response format and routing logic
5. **No Hardcoding**: No need to predefine exact menu options or connections