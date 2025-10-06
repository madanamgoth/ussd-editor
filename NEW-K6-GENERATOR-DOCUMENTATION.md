# Updated K6 Test Generator for Canvas Graph Structure

## Overview

The new K6 test generator has been updated to work with your new canvas-based graph structure. It now properly traverses the graph from START to END nodes, extracts all possible paths, and generates comprehensive K6 load testing scripts.

## Key Features

### 🎯 **Graph-Based Path Discovery**
- **Traverses from START to END nodes** to find all possible user journeys
- **Handles all node types**: START, INPUT, MENU, DYNAMIC-MENU, ACTION, END
- **Edge-aware routing** using your canvas edge connections
- **Prevents infinite loops** with depth limiting and visited tracking

### 🔄 **Dynamic Input Support**
- **Smart input generation** based on `storeAttribute` (e.g., USERPIN, SENDMONEYAMOUNT, RCMSISDN)
- **Type-aware value generation**:
  - PIN/PASSWORD → `1234, 5678, 0000, 9999`
  - AMOUNT/MONEY → `10, 50, 100, 500, 1000, 5000`
  - PHONE/MSISDN → `777123456, 778987654`
  - ACCOUNT → `123456789, 987654321`

### 📋 **Dynamic Menu Handling**
- **Extracts menu options** from API responses during runtime
- **Pattern recognition** for numbered options (1. Option, 2. Option)
- **Automatic selection** from available menu items
- **Validates dynamic content** structure

### ⚡ **Action Node Processing**
- **Automatically traverses** ACTION nodes without user input
- **Template-aware** API call tracking
- **Success path routing** based on response codes (200, 400, 500)
- **Conditional logic** support for response-based routing

## How It Works

### 1. **Graph Parsing**
```javascript
// Your canvas graph structure
const graphData = {
  nodes: [
    {
      id: "start_1758807107061_956",
      type: "start",
      data: {
        config: {
          ussdCode: "123",
          prompts: { en: "Welcome to our service" }
        }
      }
    }
    // ... more nodes
  ],
  edges: [
    {
      source: "start_1758807107061_956",
      target: "input_1758807120912_174",
      sourceHandle: "option-1"
    }
    // ... more edges
  ]
}
```

### 2. **Path Discovery**
The generator finds all possible paths from START to END:
```
START(123) → INPUT(USERPIN:*) → ACTION(API) → MENU(1|2) → INPUT(AMOUNT:*) → END
```

### 3. **Test Case Generation**
Each path becomes a test scenario:
```javascript
{
  name: "Flow_start_1758807107061_956_Path_1",
  steps: [
    { action: "Dial USSD code: 123", expectedResult: "Please enter your pin:" },
    { action: "Enter USERPIN: dynamic value", expectedResult: "1. Send Money\n2. Pay Bills" },
    { action: "Select menu option: 1", expectedResult: "Please enter your amount:" },
    { action: "Enter SENDMONEYAMOUNT: dynamic value", expectedResult: "Thank you for using our service!" }
  ]
}
```

### 4. **K6 Script Generation**
Generates production-ready K6 scripts with:
- **Load profiles** (light, moderate, heavy, stress)
- **Custom metrics** for business KPIs
- **Enhanced assertions** with content validation
- **Dynamic input handling** for realistic testing
- **Error tracking** and performance monitoring

## Example Usage

### In Your React Component (Updated)
```javascript
const generateK6Script = () => {
  // Prepare graph data from canvas
  const graphData = {
    nodes: nodes,           // From React Flow canvas
    edges: edges,           // From React Flow canvas  
    timestamp: new Date().toISOString()
  };
  
  // Create new graph-based generator
  const generator = new K6GraphTestGenerator(graphData, config);
  
  // Generate comprehensive K6 script
  const script = generator.generateK6Script();
  const analysis = generator.getFlowAnalysis();
  const testCases = generator.generateTestCases();
};
```

### Generated K6 Script Features
```javascript
// Dynamic value generation based on storeAttribute
function generateDynamicValue(storeAttribute) {
  switch (true) {
    case attr.includes('PIN'):
      return ['1234', '5678', '0000'][Math.floor(Math.random() * 3)];
    case attr.includes('AMOUNT'):
      return [50, 100, 500, 1000][Math.floor(Math.random() * 4)].toString();
    case attr.includes('PHONE'):
      return '777' + Math.floor(Math.random() * 10000000);
  }
}

// Dynamic menu processing
function processDynamicMenuResponse(response) {
  const menuOptions = [];
  const optionRegex = /\d+\.\s*([^\n\r]+)/g;
  // Extract: 1.Electricity Board, 2.Water Supply Dept, etc.
}

// Enhanced content validation
function validateResponse(response, assertion) {
  // Smart content matching based on assertion type
  // - Strict matching for END nodes
  // - Menu structure validation for MENU nodes  
  // - Input prompt detection for INPUT nodes
  // - Dynamic content handling for DYNAMIC-MENU nodes
}
```

## Coverage Analysis

The new generator provides comprehensive coverage analysis:

### ✅ **Test Case Discovery**
- Finds all possible flow paths automatically
- Calculates total possible scenarios vs. generated test cases
- Identifies unreachable paths and dead ends

### 📊 **Path Coverage** 
- Measures average path depth vs. total nodes
- Tracks edge utilization across all scenarios
- Identifies unused nodes and connections

### 🔧 **Dynamic Features**
- **Dynamic Input Support**: Detects storeAttribute usage
- **Dynamic Menu Support**: Identifies API-driven menus
- **Action Node Support**: Tracks template-based API calls

### 📈 **Performance Metrics**
- **Flow completion rate**: Success vs. failure ratios
- **Step failure rate**: Individual step validation success
- **Dynamic menu handling**: Menu extraction success rate
- **Business metrics**: Transaction values, user abandonment

## Migration from Old Generator

### What Changed
1. **Input**: Now uses canvas graph structure instead of exported flow format
2. **Path Discovery**: Graph traversal instead of recursive flow parsing  
3. **Node Types**: Handles lowercase canvas types (start, input, menu) and uppercase (START, INPUT, MENU)
4. **Edge Awareness**: Uses actual canvas edges for routing decisions
5. **Dynamic Menus**: Better support for API-driven dynamic content

### Benefits
1. **More Accurate**: Reflects actual canvas connections
2. **Better Coverage**: Finds all possible paths automatically
3. **Dynamic Content**: Handles runtime menu generation
4. **Realistic Testing**: Smart input generation based on field types
5. **Enhanced Monitoring**: Business and technical metrics combined

## Example Test Output

```bash
🚀 Starting scenario: Flow_start_1758807107061_956_Path_1 for 777123456
🔄 Dynamic input: USERPIN -> 1234
📋 Extracted 2 menu options: [{"number":"1","text":"Send Money"},{"number":"2","text":"Pay Bills"}]
🔄 Dynamic input: SENDMONEYAMOUNT -> 500
✅ Flow completed successfully for 777123456

📊 Canvas Graph USSD Load Test Completed
📋 Scenarios tested: 1
📈 Flow Analysis: {
  "totalNodes": 6,
  "totalEdges": 5, 
  "startNodes": 1,
  "endNodes": 1,
  "totalScenarios": 1,
  "nodeTypes": ["START", "INPUT", "ACTION", "MENU", "END"],
  "averagePathLength": 5,
  "dynamicMenuNodes": 0,
  "actionNodes": 1
}
```

This new implementation provides a much more robust and accurate K6 test generation that properly reflects your canvas-based USSD flow design while maintaining comprehensive load testing capabilities.