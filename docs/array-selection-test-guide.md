# 🎯 Array Selection & Configuration Test Guide

## Enhanced Dynamic Menu Interface

The template creator now provides **full control** over array selection and key mapping for dynamic menus.

## 🚀 How to Test the New Interface

### Step 1: Enable Dynamic Menu Detection
1. Go to: http://localhost:5175/
2. Navigate to API Template Builder → Step 3
3. ✅ Check: "📋 Next node is a Dynamic Menu"

### Step 2: Paste Test Data
Use this sample JSON with multiple arrays:

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
    ],
    "categories": ["Fiction", "Non-Fiction", "Biography"],
    "recommendations": [
        {"id": "REC001", "title": "Dune", "score": 95},
        {"id": "REC002", "title": "Foundation", "score": 92}
    ]
}
```

### Step 3: Preview Arrays
Click: **🔍 Preview Arrays for Dynamic Menu**

**Expected Results:**
- ✅ Found 4 array(s) suitable for dynamic menus:
  - Array #1: `data` (object_array)
  - Array #2: `data[0].genres` (string_array)  
  - Array #3: `categories` (string_array)
  - Array #4: `recommendations` (object_array)

### Step 4: Select Your Target Array
**🎯 Select Array for Dynamic Menu:**

Choose from the radio button options:
- ⚪ **Array #1: `data`** - Book objects with title, author, year
- ⚪ **Array #2: `data[0].genres`** - Genre strings  
- ⚪ **Array #3: `categories`** - Category strings
- ⚪ **Array #4: `recommendations`** - Recommendation objects

### Step 5: Configure Array Settings

#### Example: Select "data" (books array)

**⚙️ Configure Dynamic Menu Settings:**

1. **📝 Display Key (what users see):**
   - Dropdown options: `title`, `author`, `year`, `genres`
   - Select: `title` (users will see book titles)

2. **🔑 Value Key (for routing):**  
   - Options: `Array Index`, `title`, `author`, `year`, `genres`
   - Select: `title` (route based on selected book title)

3. **💾 Session Variable Name:**
   - Auto-suggested: `menuArray_data`
   - Custom: `menuArray_books` (you can change this)

### Step 6: Preview Configuration

**🔍 Configuration Preview:**
```
Array Path: data
Session Variable: menuArray_books
Display Field: title
Value Source: title

Sample USSD Menu:
1. The Hitchhiker's Guide to the Galaxy
2. Pride and Prejudice  
3. 1984
```

### Step 7: Generate Enhanced JOLT

**📤 Field Mapping:**
```json
{
  "status": "operationStatus",
  "userId": "accountId"
}
```

Click: **🔄 Generate Response JOLT Spec**

**Expected Enhanced JOLT:**
```json
[
  {
    "operation": "shift",
    "spec": {
      "input": {
        "status": "operationStatus",
        "userId": "accountId", 
        "data": {
          "*": {
            "title": "menuArray_books_formatted[&1]",
            "@": "menuArray_books[&1]"
          }
        }
      }
    }
  },
  {
    "operation": "modify-overwrite-beta",
    "spec": {
      "menuArray_books_formatted": {
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

## 🎯 Different Array Type Examples

### String Array Selection (categories)
- **Display Key**: Direct string values
- **Value Key**: `Array Index` or `Direct Values`
- **Result**: `["1. Fiction", "2. Non-Fiction", "3. Biography"]`

### Object Array Selection (recommendations)  
- **Display Key**: `title` (what users see)
- **Value Key**: `id` (for routing)
- **Result**: Menu shows titles, routes by ID

### Nested Array Selection (genres)
- **Display Key**: Direct string values
- **Value Key**: Array Index
- **Result**: Genre selection menu

## 🔧 Dynamic Menu Node Configuration

### Using the Selected Configuration

In your Dynamic Menu node:

1. **Data Source**: Session Variable
2. **Variable Name**: `menuArray_books_formatted` (the formatted display array)
3. **Value Source**: `menuArray_books` (original data) or specific field
4. **Routing Strategy**: Based on your value key selection

### Session Variables Created

After JOLT transformation:
```json
{
  "operationStatus": "200",
  "accountId": "3982048023",
  "menuArray_books_formatted": [
    "1. The Hitchhiker's Guide to the Galaxy",
    "2. Pride and Prejudice",
    "3. 1984"
  ],
  "menuArray_books": [
    {"title": "The Hitchhiker's Guide...", "author": "Douglas Adams", ...},
    {"title": "Pride and Prejudice", "author": "Jane Austen", ...},
    {"title": "1984", "author": "George Orwell", ...}
  ],
  "menuArray_books_meta": {
    "type": "object_array",
    "sampleKeys": ["title", "author", "year", "genres"],
    "size": 3,
    "displayKey": "title",
    "valueKey": "title",
    "sessionVariable": "menuArray_books"
  }
}
```

## ✅ Key Benefits

1. **🎯 Precise Control**: Select exactly which array to use
2. **🔧 Custom Configuration**: Choose display and value keys
3. **💾 Flexible Naming**: Customize session variable names  
4. **👀 Live Preview**: See exactly how your menu will look
5. **📊 Rich Metadata**: Complete configuration stored for Dynamic Menu node

## 🔍 Validation Checklist

- [ ] Multiple arrays detected correctly
- [ ] Radio button selection works
- [ ] Configuration panel appears when array selected
- [ ] Display key dropdown shows object properties  
- [ ] Value key options include array index and object fields
- [ ] Session variable name is editable
- [ ] Sample menu preview shows correctly formatted options
- [ ] JOLT generation uses selected configuration only
- [ ] Metadata includes all configuration details

This enhanced interface gives you **complete control** over which array to target and how to configure it for your specific dynamic menu needs!