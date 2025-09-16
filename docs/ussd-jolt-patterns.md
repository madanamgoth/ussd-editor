# USSD Menu JOLT Transformation Examples

## 📋 Correct JOLT Patterns for USSD Dynamic Menus

### Pattern 1: String Array → Numbered Menu
**Use Case**: Simple list of options like service types, locations, etc.

**Input:**
```json
{
  "services": ["Transfer", "Balance", "Mini Statement", "Bill Payment"]
}
```

**JOLT Specification:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "services": "menuItems"
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuItems": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "menuFormatted": true
    }
  }
]
```

**Output:**
```json
{
  "menuItems": [
    "1. Transfer",
    "2. Balance", 
    "3. Mini Statement",
    "4. Bill Payment"
  ],
  "success": true,
  "menuFormatted": true
}
```

**USSD Display:**
```
Select Service:
1. Transfer
2. Balance
3. Mini Statement
4. Bill Payment
```

---

### Pattern 2: Object Array → Extract Title Field
**Use Case**: Account lists, product catalogs, appointment lists

**Input:**
```json
{
  "accounts": [
    {
      "accountId": "ACC001",
      "accountName": "Primary Savings", 
      "balance": 5000.00,
      "type": "SAVINGS"
    },
    {
      "accountId": "ACC002",
      "accountName": "Business Current",
      "balance": 12500.00, 
      "type": "CURRENT"
    },
    {
      "accountId": "ACC003",
      "accountName": "Fixed Deposit",
      "balance": 50000.00,
      "type": "FIXED_DEPOSIT"
    }
  ]
}
```

**JOLT Specification:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "accounts": {
          "*": {
            "accountName": "menuItems[&1]",
            "accountId": "menuValues[&1]",
            "@": "originalData[&1]"
          }
        }
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuItems": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "menuType": "account_selection"
    }
  }
]
```

**Output:**
```json
{
  "menuItems": [
    "1. Primary Savings",
    "2. Business Current", 
    "3. Fixed Deposit"
  ],
  "menuValues": ["ACC001", "ACC002", "ACC003"],
  "originalData": [
    {"accountId": "ACC001", "accountName": "Primary Savings", "balance": 5000.00, "type": "SAVINGS"},
    {"accountId": "ACC002", "accountName": "Business Current", "balance": 12500.00, "type": "CURRENT"},
    {"accountId": "ACC003", "accountName": "Fixed Deposit", "balance": 50000.00, "type": "FIXED_DEPOSIT"}
  ],
  "success": true,
  "menuType": "account_selection"
}
```

**USSD Display:**
```
Select Account:
1. Primary Savings
2. Business Current
3. Fixed Deposit
```

---

### Pattern 3: Number Array → Formatted Menu
**Use Case**: Amount options, quantity selections

**Input:**
```json
{
  "amounts": [100, 500, 1000, 2000, 5000]
}
```

**JOLT Specification:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "amounts": "menuItems"
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuItems": {
        "*": "=concat(=toString(=add(1,&1)),'. $',=toString(@(1,&)))"
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "currency": "USD"
    }
  }
]
```

**Output:**
```json
{
  "menuItems": [
    "1. $100",
    "2. $500",
    "3. $1000", 
    "4. $2000",
    "5. $5000"
  ],
  "success": true,
  "currency": "USD"
}
```

---

### Pattern 4: Complex Object with Multiple Display Fields
**Use Case**: Product listings with price, appointment with time

**Input:**
```json
{
  "products": [
    {
      "id": "PRD001",
      "name": "iPhone 15 Pro",
      "price": 999.99,
      "category": "Electronics"
    },
    {
      "id": "PRD002", 
      "name": "Samsung Galaxy S24",
      "price": 899.99,
      "category": "Electronics"
    }
  ]
}
```

**JOLT Specification:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "products": {
          "*": {
            "name": "tempNames[&1]",
            "price": "tempPrices[&1]", 
            "id": "menuValues[&1]",
            "@": "originalData[&1]"
          }
        }
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuItems": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(2,tempNames[&]),@(1,' - $'),=toString(@(2,tempPrices[&])))"
      }
    }
  },
  {
    "operation": "remove",
    "spec": {
      "tempNames": "",
      "tempPrices": ""
    }
  }
]
```

**Output:**
```json
{
  "menuItems": [
    "1. iPhone 15 Pro - $999.99",
    "2. Samsung Galaxy S24 - $899.99"
  ],
  "menuValues": ["PRD001", "PRD002"],
  "originalData": [...],
}
```

---

## 🎯 Enhanced Dynamic Menu JOLT Generation

### Auto-Detection Logic

```javascript
// Pseudo-code for JOLT generation based on array type

if (arrayType === 'string_array') {
  return {
    shift: { "arrayPath": "menuItems" },
    modify: { 
      "menuItems": { "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))" }
    }
  };
}

if (arrayType === 'object_array') {
  return {
    shift: { 
      "arrayPath": {
        "*": {
          "[displayKey]": "menuItems[&1]",
          "[valueKey]": "menuValues[&1]",
          "@": "originalData[&1]"
        }
      }
    },
    modify: {
      "menuItems": { "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))" }
    }
  };
}

if (arrayType === 'number_array') {
  return {
    shift: { "arrayPath": "menuItems" },
    modify: { 
      "menuItems": { "*": "=concat(=toString(=add(1,&1)),'. ',=toString(@(1,&)))" }
    }
  };
}
```

### Session Variables for Dynamic Menu

After JOLT transformation, the session contains:

```json
{
  "menuItems": ["1. Option A", "2. Option B", "3. Option C"],
  "menuValues": ["VAL_A", "VAL_B", "VAL_C"],
  "originalData": [...],
  "menuType": "selection_type",
  "success": true
}
```

**Dynamic Menu Node Configuration:**
- **Data Source**: Session Variable
- **Display Array**: `menuItems`  
- **Value Array**: `menuValues` (or indices)
- **Routing**: Based on selected value

---

## 🚀 Benefits of This Approach

1. **📱 Perfect USSD Format**: Numbered menus ready for display
2. **🔄 Flexible Routing**: Preserve original values for routing decisions  
3. **💾 Data Preservation**: Keep original objects for detailed views
4. **🎯 Type-Aware**: Handle strings, numbers, and objects appropriately
5. **⚡ Performance**: Single JOLT transformation handles everything

---

## 🧪 Testing the Patterns

### Input for Template Creator:

```json
{
  "status": "success",
  "data": {
    "accounts": [
      {"accountId": "ACC001", "accountName": "Savings", "balance": 5000},
      {"accountId": "ACC002", "accountName": "Current", "balance": 2500}
    ],
    "services": ["Transfer", "Balance", "Statement"]
  }
}
```

### Expected Enhanced JOLT Output:

```json
[
  {
    "operation": "shift", 
    "spec": {
      "input": {
        "status": "operationStatus",
        "data": {
          "accounts": {
            "*": {
              "accountName": "menuArray_data_accounts_formatted[&1]",
              "accountId": "menuArray_data_accounts_values[&1]",
              "@": "menuArray_data_accounts[&1]"
            }
          },
          "services": "menuArray_data_services_formatted"
        }
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuArray_data_accounts_formatted": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      },
      "menuArray_data_services_formatted": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
]
```

This produces perfectly formatted USSD menus ready for dynamic menu consumption!