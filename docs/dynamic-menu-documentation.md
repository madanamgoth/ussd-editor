# Dynamic Menu Node Documentation

## Overview

The Dynamic Menu node is a new USSD flow node type that enables API-driven menu generation. Unlike static menu nodes where options are predefined, dynamic menu nodes fetch menu options from external APIs at runtime and generate numbered menu lists dynamically.

## How Dynamic Menu Works

### 1. API Configuration
The dynamic menu node is configured with:
- **API Endpoint**: The URL to fetch menu data from
- **HTTP Method**: GET or POST 
- **Response Key**: Path to the array in the API response (e.g., "data" or "result.items")
- **Name Field**: Field name that contains the display text (e.g., "name", "title")
- **ID Field**: Field name that contains the unique identifier (e.g., "id", "code")

### 2. Runtime Behavior
When a user reaches a dynamic menu node:

1. **API Call**: The system makes an API call to the configured endpoint
2. **Response Processing**: Extracts the array from the response using the configured path
3. **Menu Generation**: Creates numbered options (1, 2, 3...) from the array items
4. **User Display**: Shows the generated menu to the user
5. **Selection Processing**: Maps user input to the selected item and routes accordingly

### 3. Example Flow

**API Response:**
```json
{
  "data": [
    { "id": "MTN", "name": "MTN Mobile Money" },
    { "id": "AIRTEL", "name": "Airtel Money" },
    { "id": "VODAFONE", "name": "Vodafone Cash" }
  ]
}
```

**Generated Menu:**
```
Select Biller:
1. MTN Mobile Money
2. Airtel Money  
3. Vodafone Cash
```

**User Selection:** If user enters "2", the system captures:
- Selected Item: `{ "id": "AIRTEL", "name": "Airtel Money" }`
- Session Variable: `selectedBiller = "AIRTEL"`

## NiFi Integration

### Exported Node Format

When exported for NiFi processing, dynamic menu nodes include:

```json
{
  "id": "dynamic_menu_001",
  "type": "DYNAMIC-MENU",
  "transitions": {
    "1": "next_node_id",
    "2": "another_node_id", 
    "fallback": "error_node_id"
  },
  "apiConfig": {
    "endpoint": "https://api.billers.com/list",
    "method": "GET",
    "headers": {},
    "responseKey": "data",
    "nameField": "name",
    "idField": "id"
  },
  "menuMapping": {
    "1": "next_node_for_option_1",
    "2": "next_node_for_option_2"
  },
  "maxMenuItems": 10
}
```

### NiFi Processing Logic

NiFi processors should handle dynamic menu nodes as follows:

1. **Menu Generation Phase:**
   - Make API call using `apiConfig.endpoint` and `apiConfig.method`
   - Parse response using `apiConfig.responseKey` to get array
   - Generate menu text using `apiConfig.nameField`
   - Store mapping of option numbers to `apiConfig.idField` values in session

2. **User Response Phase:**
   - Validate user input against generated menu options
   - Look up selected item from session mapping
   - Store selected item data in session variables
   - Route to appropriate next node based on `menuMapping`

### Session Variable Storage

For each dynamic menu interaction, store:
- `{nodeId}_selectedItem`: The full selected item object
- `{nodeId}_selectedId`: The ID value of selected item  
- `{nodeId}_selectedName`: The name/display value of selected item
- `{nodeId}_menuOptions`: Array of all fetched options (for audit trail)

## Use Cases

### 1. Bill Payment Flow
```
START → Static Menu (1.Send Money, 2.Bill Pay) → 
Dynamic Biller Menu (API: /billers) → 
Amount Input → Payment Processing
```

### 2. Merchant Selection
```
START → Dynamic Merchant Menu (API: /merchants?location=user_location) → 
Product Categories → Payment
```

### 3. Account Selection  
```
START → Authentication → 
Dynamic Account Menu (API: /accounts?userId=user_id) → 
Account Operations
```

## Configuration Best Practices

### 1. API Design
- Ensure APIs return consistent JSON structure
- Include both ID and human-readable name fields
- Consider pagination for large datasets
- Implement proper error responses

### 2. Error Handling
- Always configure a fallback node for API failures
- Set reasonable timeouts for API calls
- Handle empty response arrays gracefully

### 3. Performance
- Cache API responses when appropriate
- Limit `maxMenuItems` to avoid overwhelming users
- Consider using POST for complex query parameters

### 4. User Experience
- Keep menu option names concise for SMS limitations
- Use clear, descriptive names in API responses
- Provide meaningful error messages via fallback nodes

## Limitations

1. **Menu Size**: Limited by SMS character constraints (typically 160 chars)
2. **API Dependency**: Requires reliable external API availability
3. **Real-time Data**: Menu reflects API data at time of call, not real-time
4. **Pagination**: Large datasets need API-side pagination

## Migration from Static Menus

To convert existing static menus to dynamic:

1. Identify menu options that could be fetched from APIs
2. Create/modify backend APIs to return menu data
3. Replace static MENU nodes with DYNAMIC-MENU nodes
4. Configure API endpoints and field mappings
5. Update NiFi processors to handle dynamic menu logic
6. Test with real API data and various response scenarios

## Testing

### Unit Testing
- Test API configuration validation
- Test response parsing with various JSON structures
- Test menu generation with different data sets

### Integration Testing  
- Test with actual API endpoints
- Test error scenarios (API down, timeout, invalid response)
- Test user flow with real menu selections

### Load Testing
- Test API performance under concurrent USSD sessions
- Test menu generation speed with large datasets
- Test NiFi processor performance with dynamic menus