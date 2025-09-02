const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8080',
  ussdCodes: ['*123#', '*456#', '*789#'],
  phonePrefixes: ['254700', '254701', '254702', '254703'],
  
  // Load test parameters
  concurrentUsers: 50,
  testDuration: 300000, // 5 minutes in milliseconds
  rampUpTime: 30000,    // 30 seconds
  
  // Test scenarios
  scenarios: {
    completeFlow: 0.7,    // 70%
    menuNavigation: 0.2,  // 20%
    errorScenarios: 0.1   // 10%
  }
};

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  sessionMetrics: {
    started: 0,
    completed: 0,
    failed: 0
  }
};

// Utility functions
function generatePhoneNumber() {
  const prefix = CONFIG.phonePrefixes[Math.floor(Math.random() * CONFIG.phonePrefixes.length)];
  const suffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return prefix + suffix;
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomUssdCode() {
  return CONFIG.ussdCodes[Math.floor(Math.random() * CONFIG.ussdCodes.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP request wrapper with metrics
async function makeRequest(method, url, data = null) {
  const startTime = Date.now();
  metrics.totalRequests++;
  
  try {
    const config = {
      method,
      url: `${CONFIG.baseUrl}${url}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    
    metrics.responseTimes.push(responseTime);
    metrics.successfulRequests++;
    
    return { success: true, data: response.data, responseTime, status: response.status };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    metrics.failedRequests++;
    metrics.errors.push({
      url,
      error: error.message,
      responseTime,
      timestamp: new Date().toISOString()
    });
    
    return { success: false, error: error.message, responseTime, status: error.response?.status };
  }
}

// Test scenarios
async function completeUssdFlow(phoneNumber, sessionId, ussdCode) {
  console.log(`🟦 Starting complete USSD flow for ${phoneNumber}`);
  
  try {
    // Step 1: Start session
    const startResult = await makeRequest('POST', '/ussd/session/start', {
      sessionId,
      phoneNumber,
      ussdCode,
      text: ''
    });
    
    if (!startResult.success) {
      metrics.sessionMetrics.failed++;
      return false;
    }
    
    metrics.sessionMetrics.started++;
    await sleep(1000 + Math.random() * 1000); // Think time 1-2s
    
    // Step 2: Select menu option 1
    const continueResult = await makeRequest('POST', '/ussd/session/continue', {
      sessionId,
      phoneNumber,
      text: '1'
    });
    
    if (!continueResult.success) {
      metrics.sessionMetrics.failed++;
      return false;
    }
    
    await sleep(2000 + Math.random() * 1000); // Think time 2-3s
    
    // Step 3: End session
    const endResult = await makeRequest('POST', '/ussd/session/end', {
      sessionId,
      phoneNumber,
      text: '0'
    });
    
    if (endResult.success) {
      metrics.sessionMetrics.completed++;
      console.log(`✅ Complete flow finished for ${phoneNumber}`);
      return true;
    } else {
      metrics.sessionMetrics.failed++;
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Complete flow error for ${phoneNumber}:`, error.message);
    metrics.sessionMetrics.failed++;
    return false;
  }
}

async function menuNavigationTest(phoneNumber, sessionId, ussdCode) {
  console.log(`🟨 Starting menu navigation test for ${phoneNumber}`);
  
  try {
    // Start session
    const startResult = await makeRequest('POST', '/ussd/session/start', {
      sessionId,
      phoneNumber,
      ussdCode,
      text: ''
    });
    
    if (!startResult.success) {
      metrics.sessionMetrics.failed++;
      return false;
    }
    
    metrics.sessionMetrics.started++;
    
    // Navigate through multiple menu options
    for (let i = 0; i < 3; i++) {
      await sleep(1000 + Math.random() * 500);
      
      const option = Math.floor(Math.random() * 3) + 1;
      const navResult = await makeRequest('POST', '/ussd/session/continue', {
        sessionId,
        phoneNumber,
        text: option.toString()
      });
      
      if (!navResult.success) {
        metrics.sessionMetrics.failed++;
        return false;
      }
    }
    
    // End session
    const endResult = await makeRequest('POST', '/ussd/session/end', {
      sessionId,
      phoneNumber,
      text: '0'
    });
    
    if (endResult.success) {
      metrics.sessionMetrics.completed++;
      console.log(`✅ Menu navigation finished for ${phoneNumber}`);
      return true;
    } else {
      metrics.sessionMetrics.failed++;
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Menu navigation error for ${phoneNumber}:`, error.message);
    metrics.sessionMetrics.failed++;
    return false;
  }
}

async function errorScenariosTest(phoneNumber, sessionId, ussdCode) {
  console.log(`🟥 Starting error scenarios test for ${phoneNumber}`);
  
  try {
    // Start session
    const startResult = await makeRequest('POST', '/ussd/session/start', {
      sessionId,
      phoneNumber,
      ussdCode,
      text: ''
    });
    
    if (!startResult.success) {
      return false;
    }
    
    metrics.sessionMetrics.started++;
    await sleep(1000);
    
    // Send invalid menu option
    await makeRequest('POST', '/ussd/session/continue', {
      sessionId,
      phoneNumber,
      text: '99' // Invalid option
    });
    
    await sleep(1000);
    
    // Try invalid session
    await makeRequest('POST', '/ussd/session/continue', {
      sessionId: 'invalid-session-id',
      phoneNumber,
      text: '1'
    });
    
    console.log(`✅ Error scenarios finished for ${phoneNumber}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error scenarios test error for ${phoneNumber}:`, error.message);
    return false;
  }
}

// Single user simulation
async function simulateUser() {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  const ussdCode = randomUssdCode();
  
  const scenario = Math.random();
  
  if (scenario < CONFIG.scenarios.completeFlow) {
    await completeUssdFlow(phoneNumber, sessionId, ussdCode);
  } else if (scenario < CONFIG.scenarios.completeFlow + CONFIG.scenarios.menuNavigation) {
    await menuNavigationTest(phoneNumber, sessionId, ussdCode);
  } else {
    await errorScenariosTest(phoneNumber, sessionId, ussdCode);
  }
}

// Calculate statistics
function calculateStats() {
  const responseTimes = metrics.responseTimes.sort((a, b) => a - b);
  const total = responseTimes.length;
  
  if (total === 0) return null;
  
  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    errorRate: ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2) + '%',
    avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / total).toFixed(2) + 'ms',
    minResponseTime: responseTimes[0] + 'ms',
    maxResponseTime: responseTimes[total - 1] + 'ms',
    p50: responseTimes[Math.floor(total * 0.5)] + 'ms',
    p90: responseTimes[Math.floor(total * 0.9)] + 'ms',
    p95: responseTimes[Math.floor(total * 0.95)] + 'ms',
    p99: responseTimes[Math.floor(total * 0.99)] + 'ms',
    sessions: metrics.sessionMetrics
  };
}

// Generate report
function generateReport() {
  const stats = calculateStats();
  const report = {
    testConfig: CONFIG,
    timestamp: new Date().toISOString(),
    duration: CONFIG.testDuration,
    statistics: stats,
    errors: metrics.errors.slice(0, 10) // Top 10 errors
  };
  
  const reportPath = path.join(__dirname, `ussd-load-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 LOAD TEST REPORT');
  console.log('==================');
  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests}`);
  console.log(`Failed: ${stats.failedRequests}`);
  console.log(`Error Rate: ${stats.errorRate}`);
  console.log(`Average Response Time: ${stats.avgResponseTime}`);
  console.log(`P95 Response Time: ${stats.p95}`);
  console.log('\nSession Metrics:');
  console.log(`Started: ${stats.sessions.started}`);
  console.log(`Completed: ${stats.sessions.completed}`);
  console.log(`Failed: ${stats.sessions.failed}`);
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Main load test function
async function runLoadTest() {
  console.log('🚀 Starting USSD Load Test');
  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`Users: ${CONFIG.concurrentUsers}`);
  console.log(`Duration: ${CONFIG.testDuration / 1000}s`);
  console.log(`Ramp-up: ${CONFIG.rampUpTime / 1000}s`);
  console.log('');
  
  const startTime = Date.now();
  const endTime = startTime + CONFIG.testDuration;
  const userInterval = CONFIG.rampUpTime / CONFIG.concurrentUsers;
  
  const activeUsers = [];
  
  // Ramp up users
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    setTimeout(() => {
      const userLoop = async () => {
        while (Date.now() < endTime) {
          await simulateUser();
          await sleep(Math.random() * 5000 + 2000); // 2-7s between user sessions
        }
      };
      activeUsers.push(userLoop());
    }, i * userInterval);
  }
  
  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = ((elapsed / CONFIG.testDuration) * 100).toFixed(1);
    console.log(`⏱️  Progress: ${progress}% | Requests: ${metrics.totalRequests} | Success: ${metrics.successfulRequests} | Failed: ${metrics.failedRequests}`);
  }, 10000);
  
  // Wait for test completion
  await sleep(CONFIG.testDuration + 5000); // Extra time for cleanup
  clearInterval(progressInterval);
  
  // Wait for all users to finish
  await Promise.allSettled(activeUsers);
  
  console.log('\n✅ Load test completed!');
  generateReport();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user');
  generateReport();
  process.exit(0);
});

// Check if this is the main module
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = { runLoadTest, CONFIG };
