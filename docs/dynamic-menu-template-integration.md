# Dynamic Menu Template Integration Guide

## Overview

The enhanced Action Node template creator now includes intelligent dynamic menu detection and automatic array data preparation. This feature eliminates the need for manual configuration when creating flows that use dynamic menus.

## How It Works

### 1. Flow Pattern Recognition
The system automatically detects the following flow pattern:
```
Static Menu → Action Node (API call) → Dynamic Menu (session data) → Next Node
```

### 2. Automatic Array Detection
When you enable "Next node is a Dynamic Menu", the template creator:

- 🔍 **Scans API Response**: Analyzes the JSON response for arrays
- 📊 **Determines Array Types**: Identifies string arrays, number arrays, object arrays, or mixed arrays
- 🔑 **Extracts Object Keys**: For object arrays, identifies available properties
- 💾 **Prepares Session Data**: Automatically adds session variables for dynamic menu consumption
- 🔄 **Generates JOLT Specs**: Creates transformation specs that prepare array data

### 3. Session Variable Preparation
The system automatically creates session variables with the pattern:
```json
{
  "dynamicMenuData": {
    "menuArray_api_data_products": "api.data.products",
    "menuArray_api_data_products_meta": {
      "type": "object_array",
      "sampleKeys": ["id", "name", "price", "category"],
      "size": 5
    }
  }
}
```

## Usage Instructions

### Step 1: Enable Dynamic Menu Detection
1. Open the Action Node template creator
2. Navigate to "Step 3: Configure Response & Error Mapping"
3. Check the box: "📋 Next node is a Dynamic Menu (auto-detect arrays for menu options)"

### Step 2: Configure API Response
1. Paste your actual API response in the "Expected API Response" field
2. Configure your desired field mappings as usual
3. Click "🔍 Preview Arrays" to see detected arrays

### Step 3: Generate Enhanced Template
1. The system will automatically enhance your desired output with dynamic menu data
2. Generated JOLT specs will include array preparation
3. Session variables will be created for seamless dynamic menu consumption

## Example Flow

### API Response
```json
{
  "status": "success",
  "data": {
    "customer": {
      "name": "John Doe",
      "accountId": "ACC123"
    },
    "products": [
      {
        "id": "P001",
        "name": "Savings Account",
        "type": "savings",
        "balance": 5000.00
      },
      {
        "id": "P002", 
        "name": "Current Account",
        "type": "current",
        "balance": 2500.00
      }
    ]
  }
}
```

### Enhanced Desired Output (Auto-Generated)
```json
{
  "customerName": "data.customer.name",
  "accountId": "data.customer.accountId",
  "dynamicMenuData": {
    "menuArray_data_products": "data.products",
    "menuArray_data_products_meta": {
      "type": "object_array",
      "sampleKeys": ["id", "name", "type", "balance"],
      "size": 2
    }
  }
}
```

### Resulting Session Variables
After the Action Node executes, these session variables are available:
- `menuArray_data_products`: Contains the products array
- `menuArray_data_products_meta`: Contains metadata about the array
- `customerName`: "John Doe"
- `accountId`: "ACC123"

### Dynamic Menu Configuration
The subsequent Dynamic Menu node can be configured to:
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_data_products`
- **Display Key**: `name` (from meta.sampleKeys)
- **Value Key**: `id` (from meta.sampleKeys)

## Array Type Detection

### String Arrays
```json
["Option 1", "Option 2", "Option 3"]
```
- **Type**: `string_array`
- **Menu Display**: Direct string values
- **Menu Values**: Array indices or string values

### Number Arrays
```json
[100, 200, 300, 400]
```
- **Type**: `number_array`
- **Menu Display**: Number values as strings
- **Menu Values**: Number values or indices

### Object Arrays
```json
[
  {"id": "1", "name": "Product A", "price": 100},
  {"id": "2", "name": "Product B", "price": 200}
]
```
- **Type**: `object_array`
- **Sample Keys**: ["id", "name", "price"]
- **Menu Display**: Any object property
- **Menu Values**: Any object property

### Mixed Arrays
```json
["String", 123, {"name": "Object"}, null]
```
- **Type**: `mixed_array`
- **Handling**: Special conversion logic applied
- **Menu Display**: String representation of each element

## Benefits

1. **🚀 Faster Development**: No manual session variable configuration
2. **🔍 Auto-Discovery**: Automatically finds all arrays in API responses
3. **🛡️ Error Prevention**: Reduces configuration mistakes
4. **📊 Rich Metadata**: Provides detailed information about detected arrays
5. **🔄 Seamless Integration**: Works with existing JOLT transformation system

## Best Practices

### For API Responses
- Always use actual API response data for accurate array detection
- Ensure arrays contain representative sample data
- Test with both small and large arrays

### For Object Arrays
- Choose meaningful display keys (usually 'name', 'title', 'description')
- Select unique value keys (usually 'id', 'code', 'value')
- Consider sort order (can be configured in Dynamic Menu node)

### For Session Variable Names
- Session variables follow the pattern: `menuArray_{path_with_underscores}`
- Metadata variables append `_meta` to the variable name
- Use descriptive path names for better organization

## Troubleshooting

### No Arrays Detected
- Verify your API response contains actual arrays (`[]`)
- Check that the JSON is valid and properly formatted
- Ensure arrays are not empty

### Wrong Array Selected
- Use the "🔍 Preview Arrays" button to see all detected arrays
- The system prioritizes object arrays over primitive arrays
- Manually verify the array path in your API response

### Session Variables Not Available
- Ensure the Action Node executes successfully before the Dynamic Menu
- Check that the JOLT transformation includes the `dynamicMenuData` section
- Verify session variable names match between Action and Dynamic Menu nodes

## Advanced Configuration

### Custom Array Selection
If the auto-detection selects the wrong array, you can manually override:

1. Note the detected array paths from the preview
2. Manually configure your desired output to use the correct array path
3. Ensure the session variable name matches your Dynamic Menu configuration

### Multiple Arrays
If your API response contains multiple arrays:

1. The system will detect all arrays
2. Currently, it prepares all arrays for potential use
3. Configure your Dynamic Menu to use the specific array you need

### Complex Nested Arrays
For deeply nested structures:

```json
{
  "data": {
    "categories": [
      {
        "name": "Electronics",
        "products": [
          {"id": "1", "name": "Phone"},
          {"id": "2", "name": "Laptop"}
        ]
      }
    ]
  }
}
```

The system will detect:
- `data.categories` (category objects)
- `data.categories[0].products` (product objects within categories)

Choose the appropriate array based on your menu requirements.

## Integration with NiFi

The enhanced templates export seamlessly to NiFi format with:

- **Proper JOLT Transformations**: All array preparation is handled via standard JOLT specs
- **Session Variable Storage**: Uses NiFi's session storage mechanisms
- **Standard Flow Processing**: No special NiFi components required
- **Error Handling**: Maintains existing error handling patterns

## Future Enhancements

Planned improvements include:

1. **Multi-Array Support**: Handle multiple dynamic menus in a single flow
2. **Smart Key Selection**: AI-powered suggestion of display/value keys
3. **Preview Generation**: Live preview of how the dynamic menu will look
4. **Performance Optimization**: Efficient handling of large arrays
5. **Custom Formatting**: Advanced array formatting options

---

*This feature represents a significant step forward in USSD flow automation, reducing development time and improving reliability for dynamic menu implementations.*