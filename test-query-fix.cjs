const alasql = require('alasql');

console.log('=== Testing Query Processing Fix ===');

// Setup table
alasql('DROP TABLE IF EXISTS FLOWFILE');
alasql('CREATE TABLE FLOWFILE');

const testData = {
  httpCode: 200,
  userStatus: 'SUB',
  userId: '3982048023',
  fetchquery: 'menu1'
};
alasql.tables.FLOWFILE.data = [testData];

// Test 1: CASE WHEN query (should work as-is)
console.log('\n1. Testing CASE WHEN query:');
const caseQuery = `SELECT fetchquery,
  TRIM(
    CASE 
      WHEN httpCode = 200 AND userStatus='SUB' THEN 'condition1'
      ELSE 'NoMatch'
    END
  ) AS matchedPath
FROM FLOWFILE`;

try {
  const result1 = alasql(caseQuery);
  console.log('✅ CASE WHEN query successful:', result1);
} catch (e) {
  console.log('❌ CASE WHEN query failed:', e.message);
}

// Test 2: Simple WHEN query (should be converted to WHERE)
console.log('\n2. Testing standalone WHEN query:');
const standaloneQuery = "SELECT fetchquery FROM FLOWFILE WHEN httpCode = 200 AND userStatus='SUB'";

// Apply our conversion logic
let processedQuery = standaloneQuery;
if (processedQuery.match(/FROM\s+FLOWFILE\s+WHEN\s+/gi)) {
  processedQuery = processedQuery.replace(/FROM\s+FLOWFILE\s+WHEN\s+/gi, 'FROM FLOWFILE WHERE ');
}

console.log('Original query:', standaloneQuery);
console.log('Processed query:', processedQuery);

try {
  const result2 = alasql(processedQuery);
  console.log('✅ Converted WHEN query successful:', result2);
} catch (e) {
  console.log('❌ Converted WHEN query failed:', e.message);
}

// Test 3: Valid WHERE query (should work as-is)
console.log('\n3. Testing WHERE query:');
const whereQuery = "SELECT fetchquery FROM FLOWFILE WHERE httpCode = 200 AND userStatus='SUB'";

try {
  const result3 = alasql(whereQuery);
  console.log('✅ WHERE query successful:', result3);
} catch (e) {
  console.log('❌ WHERE query failed:', e.message);
}