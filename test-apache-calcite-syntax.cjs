const alasql = require('alasql');

console.log('=== Apache Calcite SQL Standard Syntax ===\n');

// Setup test data
alasql('DROP TABLE IF EXISTS FLOWFILE');
alasql('CREATE TABLE FLOWFILE');
const testData = { httpCode: 200, userStatus: 'SUB', fetchquery: 'menu1' };
alasql.tables.FLOWFILE.data = [testData];

console.log('✅ VALID Apache Calcite SQL:');
console.log('1. WHERE clause for filtering:');
const validQuery1 = 'SELECT fetchquery FROM FLOWFILE WHERE httpCode = 200';
console.log('   Query:', validQuery1);
try {
  console.log('   Result:', alasql(validQuery1));
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n2. CASE WHEN for conditional values:');
const validQuery2 = 'SELECT CASE WHEN httpCode = 200 THEN \'success\' ELSE \'error\' END AS status FROM FLOWFILE';
console.log('   Query:', validQuery2);
try {
  console.log('   Result:', alasql(validQuery2));
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n3. Complex CASE WHEN with multiple conditions:');
const validQuery3 = `SELECT fetchquery, 
  CASE 
    WHEN httpCode = 200 AND userStatus = 'SUB' THEN 'condition1'
    WHEN httpCode = 200 AND userStatus = 'AGENT' THEN 'condition2'
    ELSE 'NoMatch'
  END AS matchedPath
FROM FLOWFILE`;
console.log('   Query:', validQuery3);
try {
  console.log('   Result:', alasql(validQuery3));
} catch (e) {
  console.log('   Error:', e.message);
}

console.log('\n❌ INVALID Apache Calcite SQL:');
console.log('4. Standalone WHEN clause (this should fail):');
const invalidQuery = 'SELECT fetchquery FROM FLOWFILE WHEN httpCode = 200';
console.log('   Query:', invalidQuery);
try {
  console.log('   Result:', alasql(invalidQuery));
} catch (e) {
  console.log('   ❌ Error (as expected):', e.message);
}

console.log('\n📋 CONCLUSION:');
console.log('- Apache Calcite uses standard SQL syntax');
console.log('- Use WHERE for filtering rows');  
console.log('- Use CASE WHEN for conditional expressions');
console.log('- Standalone WHEN clauses are NOT valid SQL');