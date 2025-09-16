# Dynamic Menu Implementation Example

## Example API Configuration

Here's a practical example of how to use the Dynamic Menu node for a bill payment USSD flow:

### 1. Sample API Response for Billers
```json
{
  "status": "success",
  "data": [
    {
      "id": "MTN_MM",
      "name": "MTN Mobile Money",
      "type": "mobile_money",
      "fee": "1%"
    },
    {
      "id": "AIRTEL_MONEY", 
      "name": "Airtel Money",
      "type": "mobile_money",
      "fee": "1.5%"
    },
    {
      "id": "ELECTRICITY_ECG",
      "name": "ECG Electricity",
      "type": "utility",
      "fee": "Free"
    },
    {
      "id": "WATER_GWCL",
      "name": "GWCL Water Bills",
      "type": "utility", 
      "fee": "GHS 2.00"
    }
  ]
}
```

### 2. Dynamic Menu Configuration

**API Endpoint:** `https://api.paymentgateway.com/billers`
**Method:** GET
**Response Key:** `data`
**Name Field:** `name`
**ID Field:** `id`
**Max Menu Items:** 8

### 3. Generated USSD Menu

When a user reaches this dynamic menu node, they will see:

```
Select Biller:
1. MTN Mobile Money
2. Airtel Money
3. ECG Electricity
4. GWCL Water Bills

Enter your choice:
```

### 4. Menu Mapping Configuration

Configure connections for each option:
- Option 1 → `amount_input_node` (for MTN Mobile Money)
- Option 2 → `amount_input_node` (for Airtel Money) 
- Option 3 → `account_number_node` (for Electricity)
- Option 4 → `account_number_node` (for Water)
- Fallback → `error_menu_node`

### 5. Session Variables Created

When user selects option 2 (Airtel Money):
- `dynamic_menu_001_selectedItem`: `{"id": "AIRTEL_MONEY", "name": "Airtel Money", "type": "mobile_money", "fee": "1.5%"}`
- `dynamic_menu_001_selectedId`: `"AIRTEL_MONEY"`
- `dynamic_menu_001_selectedName`: `"Airtel Money"`

### 6. Complete Flow Example

```
START → Main Menu (Static)
  1. Send Money
  2. Pay Bills → Dynamic Biller Menu (API call)
    1. MTN Mobile Money → Amount Input
    2. Airtel Money → Amount Input  
    3. ECG Electricity → Account Number Input
    4. GWCL Water Bills → Account Number Input
  3. Check Balance
```

## Testing the Implementation

### 1. Create a Dynamic Menu Node
1. Open the USSD Editor
2. Drag "DYNAMIC MENU" from the Node Palette
3. Double-click to configure
4. Set API configuration:
   - Endpoint: `https://jsonplaceholder.typicode.com/users`
   - Method: GET
   - Response Key: (leave empty for root array)
   - Name Field: `name`
   - ID Field: `id`

### 2. Configure Menu Mapping
1. Add menu options 1-5 in Menu Option Mapping
2. Connect each option to different nodes
3. Set a fallback node

### 3. Test the Export
1. Click "Export Flow" to see the generated JSON
2. Verify the dynamic menu node includes `apiConfig` and `menuMapping`

## Error Handling

### API Failure Scenarios
- **API Down**: Route to fallback node with error message
- **Empty Response**: Show "No options available" and route to main menu
- **Invalid Response**: Log error and route to fallback node
- **Timeout**: Show "Service temporarily unavailable" message

### User Input Validation
- **Invalid Selection**: "Invalid option. Please try again."
- **Non-numeric Input**: "Please enter a number between 1 and X"
- **Out of Range**: "Please select a valid option (1-X)"

## Performance Considerations

### API Response Time
- Target < 3 seconds for API calls
- Implement timeout handling
- Consider caching for frequently accessed data

### Menu Size Optimization
- Limit to 8-10 options max for mobile UX
- Use pagination for larger datasets
- Group related options when possible

### Session Management
- Store menu data in session for user's journey
- Clean up session data after transaction completion
- Implement session timeouts