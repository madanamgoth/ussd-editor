# 🎯 3-Part USSD Structure Test Guide

## Enhanced JOLT Generation for Complete USSD Flow

The enhanced system now creates a **3-part structure** for complete USSD dynamic menu workflows:

1. **Individual Data**: Each array item stored separately for detailed access
2. **Dynamic Menu**: Numbered menu options for user display  
3. **Session Data**: Routing values based on user selection

## 🧪 Test the Enhanced Structure

### Step 1: Setup Configuration
1. Go to: http://localhost:5175/
2. Navigate to API Template Builder → Step 3
3. ✅ Check: "📋 Next node is a Dynamic Menu"

### Step 2: Use Test Data
Paste this sample JSON:

```json
{
    "status": "200",
    "userId": "3982048023",
    "data": [
        {
            "title": "The Hitchhiker's Guide to the Galaxy",
            "author": "Douglas Adams",
            "year": 1979,
            "genres": [
                "Science Fiction",
                "Comedy"
            ]
        },
        {
            "title": "Pride and Prejudice",
            "author": "Jane Austen",
            "year": 1813,
            "genres": [
                "Romance",
                "Classic"
            ]
        },
        {
            "title": "1984",
            "author": "George Orwell",
            "year": 1949,
            "genres": [
                "Dystopian",
                "Political Fiction"
            ]
        }
    ]
}
```

### Step 3: Configure Array Selection
1. Click: **🔍 Preview Arrays for Dynamic Menu**
2. Select: **Array #1: data** (radio button)
3. Configure settings:
   - **📝 Display Key**: `title` (what users see)
   - **🔑 Value Key**: `title` (for routing)
   - **💾 Session Variable**: `menuArray_books`

### Step 4: Configure Field Mapping
```json
{
  "status": "nifi.status",
  "userId": "nifi.userId"
}
```

### Step 5: Generate Enhanced JOLT
Click: **🔄 Generate Response JOLT Spec**

## 📋 Expected 3-Part Structure

### Enhanced JOLT Specification:
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "status": "nifi.status",
        "userId": "nifi.userId",
        "data[*]": "menuArray_books_items[&1]",
        "data[*].title": "menuArray_books_menu[&1]",
        "data[*].title": "menuArray_books_values[&1]"
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuArray_books_menu": {
        "*": "=concat(=toString(=add(1,&1)),'. ',@(1,&))"
      }
    }
  },
  {
    "operation": "default",
    "spec": {
      "success": true,
      "timestamp": "2025-09-14T15:40:22.295Z",
      "status": "SUCCEEDED"
    }
  }
]
```

### Expected Output Structure:
```json
{
  "nifi.status": "200",
  "nifi.userId": "3982048023",
  
  // 📋 PART 1: Individual Data - Complete objects by index
  "menuArray_books_items": [
    {
      "title": "The Hitchhiker's Guide to the Galaxy",
      "author": "Douglas Adams",
      "year": 1979,
      "genres": ["Science Fiction", "Comedy"]
    },
    {
      "title": "Pride and Prejudice", 
      "author": "Jane Austen",
      "year": 1813,
      "genres": ["Romance", "Classic"]
    },
    {
      "title": "1984",
      "author": "George Orwell",
      "year": 1949,
      "genres": ["Dystopian", "Political Fiction"]
    }
  ],
  
  // 🎯 PART 2: Dynamic Menu - Numbered options for display
  "menuArray_books_menu": [
    "1. The Hitchhiker's Guide to the Galaxy",
    "2. Pride and Prejudice",
    "3. 1984"
  ],
  
  // 🔑 PART 3: Session Data - Values for routing decisions
  "menuArray_books_values": [
    "The Hitchhiker's Guide to the Galaxy",
    "Pride and Prejudice", 
    "1984"
  ],
  
  "success": true,
  "timestamp": "2025-09-14T15:40:22.295Z",
  "status": "SUCCEEDED"
}
```

## 🎮 USSD Flow Usage

### Dynamic Menu Node Configuration:
- **Data Source**: Session Variable
- **Variable Name**: `menuArray_books_menu`
- **Display**: Shows numbered menu to user

### User Selection Handling:
When user selects option (e.g., selects "2"):

```javascript
// User selected option 2 (array index 1)
const userChoice = 2;
const selectedIndex = userChoice - 1; // Convert to 0-based index

// Access the 3 parts:
const selectedItem = session.menuArray_books_items[selectedIndex];
const selectedValue = session.menuArray_books_values[selectedIndex]; 
const menuDisplay = session.menuArray_books_menu[selectedIndex];

// Results:
selectedItem = {
  "title": "Pride and Prejudice",
  "author": "Jane Austen", 
  "year": 1813,
  "genres": ["Romance", "Classic"]
}

selectedValue = "Pride and Prejudice"
menuDisplay = "2. Pride and Prejudice"
```

## 🔄 Complete USSD Workflow

### 1. Display Menu to User:
```
Select a Book:
1. The Hitchhiker's Guide to the Galaxy
2. Pride and Prejudice
3. 1984

Enter choice (1-3):
```

### 2. Process User Selection:
```
User enters: 2
System converts to index: 1
Accesses: menuArray_books_items[1]
Routes with: menuArray_books_values[1]
```

### 3. Next Node Actions:
- **Detail View**: Use `menuArray_books_items[index]` for complete object
- **Routing**: Use `menuArray_books_values[index]` for decisions
- **Confirmation**: Use `menuArray_books_menu[index]` for display

## 🎯 Different Value Key Examples

### Using Array Index for Routing:
- **Value Key**: `index`
- **Result**: `menuArray_books_values = [0, 1, 2]`
- **Usage**: Route based on array position

### Using Object Field for Routing:
- **Value Key**: `title`
- **Result**: `menuArray_books_values = ["Title 1", "Title 2", "Title 3"]`
- **Usage**: Route based on specific field value

### Using ID Field for Routing:
- **Value Key**: `id` (if objects have ID field)
- **Result**: `menuArray_books_values = ["ID1", "ID2", "ID3"]`
- **Usage**: Route based on unique identifiers

## ✅ Validation Points

- [ ] **Individual Data**: Complete objects accessible by index
- [ ] **Dynamic Menu**: Properly numbered (1. Option, 2. Option)
- [ ] **Session Values**: Correct routing values extracted
- [ ] **JOLT Structure**: Includes shift + modify operations
- [ ] **User Selection**: Can access any part using selection index
- [ ] **Routing Logic**: Values support conditional routing
- [ ] **Data Preservation**: All original data maintained

## 🚀 Benefits of 3-Part Structure

1. **🎯 Complete Data Access**: Full objects available for detailed views
2. **📱 Perfect USSD Display**: Numbered menus ready for user interface
3. **🔄 Flexible Routing**: Support for any routing strategy
4. **💾 Data Integrity**: Original data preserved throughout flow
5. **⚡ Performance**: Single JOLT transformation handles everything
6. **🛡️ Error Prevention**: Structured approach reduces configuration errors

This 3-part structure provides everything needed for a complete USSD dynamic menu workflow!