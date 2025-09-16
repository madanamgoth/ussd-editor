# Dynamic Menu Integration Test Examples

## Test Case 1: Banking Products API

### API Response Sample
```json
{
  "status": "200",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "customer": {
      "id": "CUST123456",
      "name": "John Doe",
      "phoneNumber": "+1234567890"
    },
    "accounts": [
      {
        "accountId": "ACC001",
        "accountName": "Primary Savings",
        "accountType": "SAVINGS",
        "balance": 5000.00,
        "currency": "USD",
        "status": "ACTIVE"
      },
      {
        "accountId": "ACC002", 
        "accountName": "Business Current",
        "accountType": "CURRENT",
        "balance": 12500.00,
        "currency": "USD",
        "status": "ACTIVE"
      },
      {
        "accountId": "ACC003",
        "accountName": "Fixed Deposit",
        "accountType": "FIXED_DEPOSIT", 
        "balance": 50000.00,
        "currency": "USD",
        "status": "MATURED"
      }
    ],
    "services": ["TRANSFER", "BALANCE_INQUIRY", "MINI_STATEMENT"]
  }
}
```

### Expected Template Configuration

#### Field Mapping (Manual Part)
```json
{
  "data.customer.name": "customerName",
  "data.customer.id": "customerId", 
  "data.customer.phoneNumber": "phoneNumber",
  "status": "responseStatus"
}
```

#### Auto-Generated Dynamic Menu Data
When "Next node is a Dynamic Menu" is enabled, the system adds:
```json
{
  "customerName": "data.customer.name",
  "customerId": "data.customer.id",
  "phoneNumber": "data.customer.phoneNumber", 
  "responseStatus": "status",
  "dynamicMenuData": {
    "menuArray_data_accounts": "data.accounts",
    "menuArray_data_accounts_meta": {
      "type": "object_array",
      "sampleKeys": ["accountId", "accountName", "accountType", "balance", "currency", "status"],
      "size": 3
    },
    "menuArray_data_services": "data.services", 
    "menuArray_data_services_meta": {
      "type": "string_array",
      "size": 3
    }
  }
}
```

#### Generated JOLT Transformation
```json
[
  {
    "operation": "shift",
    "spec": {
      "data": {
        "customer": {
          "name": "customerName",
          "id": "customerId", 
          "phoneNumber": "phoneNumber"
        },
        "accounts": "dynamicMenuData.menuArray_data_accounts",
        "services": "dynamicMenuData.menuArray_data_services"
      },
      "status": "responseStatus"
    }
  },
  {
    "operation": "default",
    "spec": {
      "dynamicMenuData": {
        "menuArray_data_accounts_meta": {
          "type": "object_array",
          "sampleKeys": ["accountId", "accountName", "accountType", "balance", "currency", "status"],
          "size": 3
        },
        "menuArray_data_services_meta": {
          "type": "string_array", 
          "size": 3
        }
      },
      "success": true,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
]
```

### Dynamic Menu Node Configuration

#### For Accounts Array
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_data_accounts`
- **Display Key**: `accountName` 
- **Value Key**: `accountId`
- **Routing Strategy**: Single Target
- **Target Node**: Account Details Node

#### For Services Array  
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_data_services`
- **Display Key**: (direct string values)
- **Value Key**: (array index or string value)
- **Routing Strategy**: Conditional
- **Routing Rules**:
  - TRANSFER → Transfer Node
  - BALANCE_INQUIRY → Balance Node
  - MINI_STATEMENT → Statement Node

---

## Test Case 2: E-commerce Product Catalog

### API Response Sample
```json
{
  "success": true,
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10
  },
  "products": [
    {
      "productId": "PRD001",
      "name": "iPhone 15 Pro", 
      "category": "Electronics",
      "price": 999.99,
      "inStock": true,
      "rating": 4.8
    },
    {
      "productId": "PRD002",
      "name": "Samsung Galaxy S24",
      "category": "Electronics", 
      "price": 899.99,
      "inStock": true,
      "rating": 4.7
    },
    {
      "productId": "PRD003",
      "name": "MacBook Air M3",
      "category": "Computers",
      "price": 1299.99, 
      "inStock": false,
      "rating": 4.9
    }
  ],
  "categories": ["Electronics", "Computers", "Accessories"]
}
```

### Field Mapping
```json
{
  "success": "operationSuccess",
  "pagination.total": "totalProducts",
  "pagination.page": "currentPage"
}
```

### Auto-Generated Dynamic Menu Data
```json
{
  "operationSuccess": "success",
  "totalProducts": "pagination.total", 
  "currentPage": "pagination.page",
  "dynamicMenuData": {
    "menuArray_products": "products",
    "menuArray_products_meta": {
      "type": "object_array",
      "sampleKeys": ["productId", "name", "category", "price", "inStock", "rating"],
      "size": 3
    },
    "menuArray_categories": "categories",
    "menuArray_categories_meta": {
      "type": "string_array", 
      "size": 3
    }
  }
}
```

### Dynamic Menu Configuration

#### For Products
- **Variable Name**: `menuArray_products`
- **Display Key**: `name`
- **Value Key**: `productId`
- **Sorting**: By `rating` (descending)
- **Filtering**: `inStock = true`

#### For Categories
- **Variable Name**: `menuArray_categories`
- **Display Key**: (direct string)
- **Value Key**: (string value)
- **Routing Strategy**: Fixed Mapping

---

## Test Case 3: Medical Records API

### API Response Sample
```json
{
  "patientInfo": {
    "patientId": "PAT789012",
    "fullName": "Jane Smith",
    "dateOfBirth": "1985-03-22",
    "gender": "Female"
  },
  "appointments": [
    {
      "appointmentId": "APT001",
      "doctorName": "Dr. Johnson",
      "specialty": "Cardiology", 
      "date": "2024-01-20",
      "time": "10:00 AM",
      "status": "SCHEDULED"
    },
    {
      "appointmentId": "APT002",
      "doctorName": "Dr. Williams",
      "specialty": "Dermatology",
      "date": "2024-01-25", 
      "time": "2:30 PM",
      "status": "CONFIRMED"
    }
  ],
  "medications": [
    {
      "medicationId": "MED001",
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "prescribedBy": "Dr. Johnson"
    }
  ],
  "testResults": [
    "Blood Test - Normal",
    "X-Ray - Clear", 
    "ECG - Regular"
  ]
}
```

### Auto-Generated Dynamic Menu Data
```json
{
  "patientName": "patientInfo.fullName",
  "patientId": "patientInfo.patientId",
  "dynamicMenuData": {
    "menuArray_appointments": "appointments",
    "menuArray_appointments_meta": {
      "type": "object_array",
      "sampleKeys": ["appointmentId", "doctorName", "specialty", "date", "time", "status"],
      "size": 2
    },
    "menuArray_medications": "medications", 
    "menuArray_medications_meta": {
      "type": "object_array",
      "sampleKeys": ["medicationId", "name", "dosage", "frequency", "prescribedBy"],
      "size": 1
    },
    "menuArray_testResults": "testResults",
    "menuArray_testResults_meta": {
      "type": "string_array",
      "size": 3
    }
  }
}
```

---

## Testing Steps

### Step 1: Setup Template Creator
1. Open Action Node template creator
2. Navigate to "Configure Response & Error Mapping"
3. Enable "Next node is a Dynamic Menu"

### Step 2: Test Array Detection  
1. Paste any of the above API responses
2. Click "🔍 Preview Arrays"
3. Verify detected arrays are correct

### Step 3: Generate Template
1. Configure field mappings as shown
2. Generate JOLT specifications
3. Verify dynamic menu data is included

### Step 4: Test in Flow
1. Create a flow: Static Menu → Action Node → Dynamic Menu
2. Use generated template in Action Node
3. Configure Dynamic Menu with session variables
4. Test end-to-end functionality

### Expected Results
- ✅ Arrays automatically detected
- ✅ Session variables created with proper naming
- ✅ Metadata includes type and sample keys
- ✅ Dynamic Menu can consume session data
- ✅ JOLT transformations work correctly
- ✅ NiFi export includes all enhancements

---

## Validation Checklist

### Array Detection
- [ ] String arrays detected correctly
- [ ] Number arrays detected correctly  
- [ ] Object arrays detected correctly
- [ ] Mixed arrays handled properly
- [ ] Nested arrays identified
- [ ] Empty arrays handled gracefully

### Session Variable Generation
- [ ] Variable names follow naming convention
- [ ] Metadata includes all required fields
- [ ] Multiple arrays supported
- [ ] No variable name conflicts

### JOLT Integration
- [ ] Enhanced desired output generated
- [ ] JOLT specs include dynamic menu data
- [ ] Transformations work with sample data
- [ ] Error handling maintained

### UI/UX
- [ ] Checkbox toggle works correctly
- [ ] Array preview displays properly
- [ ] Help text is clear and accurate
- [ ] Visual feedback on detection

### End-to-End Flow
- [ ] Action Node executes successfully
- [ ] Session variables populated correctly
- [ ] Dynamic Menu receives data
- [ ] Menu options display properly
- [ ] Routing works as expected