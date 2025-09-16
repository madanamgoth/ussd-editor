# Quick Test Guide - Enhanced Dynamic Menu Integration

## 🎯 How to Test the Enhanced Template Creator

### Step 1: Navigate to Template Creator
1. Go to http://localhost:5175/
2. Click on the "API Template Builder" or navigate to template creation

### Step 2: Enable Dynamic Menu Integration (MOVED TO TOP!)
✅ **The Dynamic Menu Integration section is now at the TOP of Step 3**

1. Look for the section: **🔄 Dynamic Menu Integration**
2. Check the box: **📋 Next node is a Dynamic Menu (auto-detect arrays for menu options)**
3. You'll see the help information expand

### Step 3: Paste Your API Response
1. Scroll down to **✅ Success Response Transformation**
2. In the **📥 Expected API Response (JSON)** field, paste your JSON response
3. Example response to test with:

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

### Step 4: Test Array Detection
1. Click the **🔍 Preview Arrays for Dynamic Menu** button (GREEN button)
2. You should see:
   - ✅ Found X array(s) suitable for dynamic menus
   - Array recommendations with session variable names
   - Suggested display/value keys
   - Next steps instructions

### Step 5: Configure Field Mapping
In the **📤 Field Mapping** field, add:
```json
{
  "status": "statusCode",
  "userId": "accountId",
  "data": "books"
}
```

### Step 6: Generate Enhanced Template
1. Click **🔄 Generate Response JOLT Spec**
2. The system will automatically:
   - Include your field mappings
   - Add `dynamicMenuData` section with array preparation
   - Create session variables for dynamic menu consumption

## 🔍 Expected Results

### Array Detection Results
You should see something like:
```
✅ Found 2 array(s) suitable for dynamic menus:

🎯 Array #1: data
Type: object_array
Session Variable: menuArray_data
Suggested Display Key: title
Suggested Value Key: title

🎯 Array #2: data[0].genres
Type: string_array  
Session Variable: menuArray_data_0_genres
Suggested Display Key: (direct string)
Suggested Value Key: index
```

### Generated JOLT Preview
The JOLT specification should include:
```json
{
  "statusCode": "200",
  "accountId": "3982048023", 
  "books": [...],
  "dynamicMenuData": {
    "menuArray_data": [...],
    "menuArray_data_meta": {
      "type": "object_array",
      "sampleKeys": ["title", "author", "year", "genres"],
      "size": 3
    }
  }
}
```

## 🚨 Troubleshooting

### "Please paste your API response first"
- Make sure you've pasted JSON in the **Expected API Response** field BEFORE clicking Preview Arrays

### "No arrays detected"
- Verify your JSON contains actual arrays `[]`
- Check that the JSON is valid (no syntax errors)
- Arrays must contain at least one element

### Button not responding
- Check browser console for errors (F12 → Console tab)
- Ensure the JSON is valid before clicking buttons
- Try refreshing the page

### Array detection not working
- The checkbox must be checked FIRST
- Then paste your JSON response
- Then click the Preview Arrays button

## 🎉 Success Indicators

✅ **Dynamic Menu section appears at the top**  
✅ **Checkbox enables additional functionality**  
✅ **Preview Arrays button appears when checkbox is checked**  
✅ **Array detection shows detailed results**  
✅ **Session variable names are generated correctly**  
✅ **JOLT specs include dynamicMenuData section**

## 📝 Next Steps After Testing

1. **Test in actual flow**: Create Action Node → Dynamic Menu flow
2. **Use session variables**: Configure Dynamic Menu with generated session variable names
3. **Verify routing**: Test that menu options route correctly
4. **Export to NiFi**: Ensure the enhanced templates work in production

---

The enhanced template creator now provides a much more intuitive workflow where dynamic menu detection is the FIRST step, followed by array preview, and finally template generation with automatic array preparation!