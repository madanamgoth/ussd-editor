# 🧪 Test the Enhanced USSD JOLT Generation

## Quick Test Instructions

### 1. Open Template Creator
- Go to: http://localhost:5175/
- Navigate to API Template Builder

### 2. Enable Dynamic Menu (Top of Step 3)
✅ Check: "📋 Next node is a Dynamic Menu (auto-detect arrays for menu options)"

### 3. Paste Test Data

**📥 Expected API Response (JSON):**
```json
{
  "status": "success",
  "customer": {
    "name": "John Doe",
    "id": "CUST123"
  },
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
  ],
  "services": ["Transfer", "Balance Inquiry", "Mini Statement", "Bill Payment"],
  "amounts": [100, 500, 1000, 2000, 5000]
}
```

### 4. Test Array Detection
Click: **🔍 Preview Arrays for Dynamic Menu**

**Expected Result:**
```
✅ Found 3 array(s) suitable for dynamic menus:

🎯 Array #1: accounts
Type: object_array  
Session Variable: menuArray_accounts
Suggested Display Key: accountName
Suggested Value Key: accountId

🎯 Array #2: services
Type: string_array
Session Variable: menuArray_services  
Suggested Display Key: (direct string)
Suggested Value Key: index

🎯 Array #3: amounts
Type: number_array
Session Variable: menuArray_amounts
Suggested Display Key: (direct number)
Suggested Value Key: index
```

### 5. Configure Field Mapping

**📤 Field Mapping (source → target):**
```json
{
  "status": "operationStatus",
  "customer.name": "customerName", 
  "customer.id": "customerId"
}
```

### 6. Generate Enhanced JOLT
Click: **🔄 Generate Response JOLT Spec**

**Expected Enhanced JOLT:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "status": "operationStatus",
        "customer": {
          "name": "customerName",
          "id": "customerId"
        },
        "accounts": {
          "*": {
            "accountName": "menuArray_accounts_formatted[&1]", 
            "accountId": "menuArray_accounts_values[&1]",
            "@": "menuArray_accounts[&1]"
          }
        },
        "services": "menuArray_services_formatted",
        "amounts": "menuArray_amounts_formatted"
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuArray_accounts_formatted": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      },
      "menuArray_services_formatted": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      },
      "menuArray_amounts_formatted": {
        "*": "=concat(=toString(=add(1,&1)),'. $',=toString(@(1,&)))"
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

### 7. Expected Output Preview
```json
{
  "operationStatus": "success",
  "customerName": "John Doe",
  "customerId": "CUST123",
  "menuArray_accounts_formatted": [
    "1. Primary Savings",
    "2. Business Current", 
    "3. Fixed Deposit"
  ],
  "menuArray_accounts_values": ["ACC001", "ACC002", "ACC003"],
  "menuArray_accounts": [
    {"accountId": "ACC001", "accountName": "Primary Savings", "balance": 5000.00, "type": "SAVINGS"},
    {"accountId": "ACC002", "accountName": "Business Current", "balance": 12500.00, "type": "CURRENT"},
    {"accountId": "ACC003", "accountName": "Fixed Deposit", "balance": 50000.00, "type": "FIXED_DEPOSIT"}
  ],
  "menuArray_services_formatted": [
    "1. Transfer",
    "2. Balance Inquiry",
    "3. Mini Statement", 
    "4. Bill Payment"
  ],
  "menuArray_amounts_formatted": [
    "1. $100",
    "2. $500",
    "3. $1000",
    "4. $2000", 
    "5. $5000"
  ],
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🎯 USSD Display Results

### Account Selection Menu:
```
Select Account:
1. Primary Savings
2. Business Current
3. Fixed Deposit

Enter choice (1-3):
```

### Service Selection Menu:
```
Select Service:
1. Transfer
2. Balance Inquiry
3. Mini Statement
4. Bill Payment

Enter choice (1-4):
```

### Amount Selection Menu:
```
Select Amount:
1. $100
2. $500
3. $1000
4. $2000
5. $5000

Enter choice (1-5):
```

## 🔧 Dynamic Menu Node Configuration

### For Accounts Menu:
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_accounts_formatted`
- **Value Source**: `menuArray_accounts_values`
- **Routing Strategy**: Single Target → Account Details

### For Services Menu:
- **Data Source**: Session Variable  
- **Variable Name**: `menuArray_services_formatted`
- **Value Source**: Array Index
- **Routing Strategy**: Conditional
  - Choice 1 → Transfer Flow
  - Choice 2 → Balance Flow  
  - Choice 3 → Statement Flow
  - Choice 4 → Bill Payment Flow

### For Amounts Menu:
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_amounts_formatted` 
- **Value Source**: Array Index
- **Routing Strategy**: Single Target → Confirmation

## ✅ Success Criteria

- [x] Dynamic menu detection works at top of Step 3
- [x] Array preview shows all 3 arrays with correct types
- [x] JOLT generation includes modify-overwrite-beta operations
- [x] Session variables follow proper naming convention
- [x] Menu items are formatted as "1. Option", "2. Option", etc.
- [x] Original data is preserved for routing decisions
- [x] Value arrays are created for object arrays

## 🚨 Troubleshooting

**Array preview shows "No arrays detected":**
- Verify JSON is valid (check for syntax errors)
- Ensure arrays contain at least one element
- Arrays must be actual arrays `[]`, not objects

**JOLT preview shows errors:**
- Check that field mappings are valid JSON
- Ensure no circular references in field paths
- Verify array paths exist in the source data

**Menu formatting incorrect:**
- Check the modify-overwrite-beta operation is included
- Verify the concat formulas are correct
- Test with simpler arrays first

This test should demonstrate the complete enhanced JOLT generation for USSD-ready dynamic menus!