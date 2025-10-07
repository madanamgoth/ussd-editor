/**
 * Enhanced K6 TPS-Based Load Test Generator for USSD
 * Allows configuration of target TPS (Transactions Per Second) instead of just VUs
 */

// Add TPS configuration to your existing K6 generator
const TPS_PROFILES = {
  low_tps: {
    name: "Low TPS Test",
    description: "Light transaction load",
    target_tps: 10,
    duration: "2m",
    max_vus: 50
  },
  moderate_tps: {
    name: "Moderate TPS Test", 
    description: "Normal transaction load",
    target_tps: 50,
    duration: "5m",
    max_vus: 200
  },
  high_tps: {
    name: "High TPS Test",
    description: "Heavy transaction load", 
    target_tps: 100,
    duration: "10m",
    max_vus: 500
  },
  stress_tps: {
    name: "Stress TPS Test",
    description: "Maximum throughput test",
    target_tps: 200,
    duration: "15m",
    max_vus: 1000
  },
  spike_tps: {
    name: "Spike TPS Test",
    description: "Sudden load increase",
    target_tps: 500,
    duration: "5m",
    max_vus: 2000
  },
  custom_tps: {
    name: "Custom TPS Test",
    description: "User-defined TPS target",
    target_tps: 0, // Will be set by user
    duration: "10m",
    max_vus: 1000
  }
};

/**
 * Calculate optimal VU count based on target TPS
 * @param {number} targetTps - Desired transactions per second
 * @param {number} avgTransactionTime - Average time per transaction (seconds)
 * @param {number} thinkTime - Time between transactions (seconds)
 * @returns {number} Recommended VU count
 */
function calculateVUsForTPS(targetTps, avgTransactionTime = 2, thinkTime = 1) {
  // Formula: VU = TPS × (Transaction Time + Think Time)
  const totalTimePerTransaction = avgTransactionTime + thinkTime;
  const requiredVUs = Math.ceil(targetTps * totalTimePerTransaction);
  
  return {
    recommendedVUs: requiredVUs,
    actualTPS: requiredVUs / totalTimePerTransaction,
    transactionTime: avgTransactionTime,
    thinkTime: thinkTime,
    utilizationRate: (avgTransactionTime / totalTimePerTransaction) * 100
  };
}

/**
 * Generate K6 script with TPS-based configuration
 */
function generateTPSBasedK6Script(config) {
  const {
    targetTPS,
    duration,
    avgTransactionTime = 2,
    thinkTime = 1,
    maxVUs = 1000
  } = config;
  
  const vuCalculation = calculateVUsForTPS(targetTPS, avgTransactionTime, thinkTime);
  const recommendedVUs = Math.min(vuCalculation.recommendedVUs, maxVUs);
  
  return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// TPS-focused metrics
const tpsActual = new Rate('tps_actual');
const transactionDuration = new Trend('transaction_duration');
const tpsTarget = new Rate('tps_target_achievement');
const concurrentUsers = new Counter('concurrent_users');

// TPS Configuration
const TPS_CONFIG = {
  TARGET_TPS: ${targetTPS},
  EXPECTED_VUS: ${recommendedVUs},
  AVG_TRANSACTION_TIME: ${avgTransactionTime},
  THINK_TIME: ${thinkTime},
  TEST_DURATION: "${duration}",
  UTILIZATION_RATE: ${vuCalculation.utilizationRate.toFixed(2)}
};

export const options = {
  scenarios: {
    tps_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.floor(${recommendedVUs} * 0.2) }, // Ramp up to 20%
        { duration: '1m', target: Math.floor(${recommendedVUs} * 0.5) },   // Ramp up to 50%
        { duration: '1m', target: ${recommendedVUs} },                     // Reach target VUs
        { duration: '${duration}', target: ${recommendedVUs} },            // Sustain load
        { duration: '1m', target: 0 }                                      // Ramp down
      ],
      gracefulRampDown: '30s'
    }
  },
  
  // TPS-focused thresholds
  thresholds: {
    // TPS Performance
    'tps_actual': ['rate>=${targetTPS * 0.9}'], // Achieve 90% of target TPS
    'tps_target_achievement': ['rate>=0.9'],    // 90% of requests meet TPS target
    
    // Response Time
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'transaction_duration': ['p(95)<${(avgTransactionTime + 1) * 1000}'],
    
    // Error Rates
    'http_req_failed': ['rate<0.01'],           // Less than 1% errors
    'checks': ['rate>0.95'],                    // 95% successful validations
    
    // System Stability
    'http_req_connecting': ['p(95)<1000'],      // Connection time
    'http_req_receiving': ['p(95)<1000']        // Response receiving time
  },

  tags: {
    test_type: 'tps_benchmark',
    target_tps: '${targetTPS}',
    expected_vus: '${recommendedVUs}',
    test_duration: '${duration}'
  }
};

// USSD Configuration
const CONFIG = {
  BASE_URL: 'http://host.docker.internal:9401',
  ENDPOINT: '/MenuManagement/RequestReceiver',
  LOGIN: 'Ussd_Bearer1',
  PASSWORD: 'test',
  PHONE_PREFIX: '777',
  SESSION_ID_PREFIX: '99'
};

// Dynamic test data
const TEST_DATA = {
  USERPIN: ['1234', '5678', '1111', '0000', '9999', '1122'],
  SENDMONEYAMOUNT: ['10', '25', '50', '100', '200', '500', '1000'],
  SENDMONEYRECIVERMSISDN: ['77712345678', '77787654321', '77756781234'],
  BILLERAMOUNT: ['25', '50', '75', '100', '150', '200', '300']
};

function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

function getDynamicValue(storeAttribute) {
  const values = TEST_DATA[storeAttribute];
  return values ? values[Math.floor(Math.random() * values.length)] : 'DEFAULT';
}

function makeUSSDRequest(sessionId, msisdn, input, newRequest = 0) {
  const url = \`\${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`;
  const params = {
    LOGIN: CONFIG.LOGIN,
    PASSWORD: CONFIG.PASSWORD,
    SESSION_ID: sessionId,
    MSISDN: msisdn,
    NewRequest: newRequest,
    INPUT: input
  };
  
  const queryString = Object.entries(params)
    .map(([key, value]) => \`\${key}=\${encodeURIComponent(value)}\`)
    .join('&');
  
  const startTime = Date.now();
  const response = http.get(\`\${url}?\${queryString}\`);
  const endTime = Date.now();
  
  // Record TPS metrics
  const transactionTime = (endTime - startTime) / 1000;
  transactionDuration.add(transactionTime);
  tpsActual.add(1);
  
  // Check if we're meeting TPS target
  const currentTime = Date.now() / 1000;
  const expectedTPS = TPS_CONFIG.TARGET_TPS;
  const actualTPS = 1 / (transactionTime + TPS_CONFIG.THINK_TIME);
  tpsTarget.add(actualTPS >= expectedTPS ? 1 : 0);
  
  return response;
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  const iterationStart = Date.now();
  
  concurrentUsers.add(1);
  
  try {
    // USSD Flow Execution
    let response;
    
    // Step 1: Dial USSD code
    response = makeUSSDRequest(sessionId, phoneNumber, '123', 1);
    check(response, {
      'USSD dial successful': (r) => r.status === 200,
      'PIN prompt received': (r) => r.body && r.body.toLowerCase().includes('pin')
    });
    
    sleep(0.5); // Realistic user delay
    
    // Step 2: Enter PIN
    const pin = getDynamicValue('USERPIN');
    response = makeUSSDRequest(sessionId, phoneNumber, pin, 0);
    check(response, {
      'PIN accepted': (r) => r.status === 200,
      'Menu displayed': (r) => r.body && /\\d+\\./.test(r.body)
    });
    
    sleep(0.5);
    
    // Step 3: Select menu option (Send Money = 1)
    response = makeUSSDRequest(sessionId, phoneNumber, '1', 0);
    check(response, {
      'Menu selection successful': (r) => r.status === 200,
      'Amount prompt received': (r) => r.body && r.body.toLowerCase().includes('amount')
    });
    
    sleep(0.5);
    
    // Step 4: Enter amount
    const amount = getDynamicValue('SENDMONEYAMOUNT');
    response = makeUSSDRequest(sessionId, phoneNumber, amount, 0);
    check(response, {
      'Amount accepted': (r) => r.status === 200,
      'Next step received': (r) => r.body && r.body.length > 0
    });
    
    // Calculate actual transaction time
    const iterationEnd = Date.now();
    const actualTransactionTime = (iterationEnd - iterationStart) / 1000;
    
    // Adjust sleep to maintain target TPS
    const targetCycleTime = 1 / TPS_CONFIG.TARGET_TPS * __VU; // Distribute load across VUs
    const remainingSleep = Math.max(0, targetCycleTime - actualTransactionTime);
    
    sleep(remainingSleep + TPS_CONFIG.THINK_TIME);
    
  } catch (error) {
    console.error(\`Transaction failed: \${error.message}\`);
  }
}

export function setup() {
  console.log('🚀 TPS-Based USSD Load Test Starting');
  console.log('=====================================');
  console.log(\`📊 Target TPS: \${TPS_CONFIG.TARGET_TPS}\`);
  console.log(\`👥 Expected VUs: \${TPS_CONFIG.EXPECTED_VUS}\`);
  console.log(\`⏱️  Avg Transaction Time: \${TPS_CONFIG.AVG_TRANSACTION_TIME}s\`);
  console.log(\`💭 Think Time: \${TPS_CONFIG.THINK_TIME}s\`);
  console.log(\`🎯 Expected Utilization: \${TPS_CONFIG.UTILIZATION_RATE}%\`);
  console.log(\`⏰ Test Duration: \${TPS_CONFIG.TEST_DURATION}\`);
  console.log('=====================================');
  
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 TPS Load Test Completed');
  console.log('==========================');
  console.log(\`Started: \${data.startTime}\`);
  console.log(\`Target TPS: \${TPS_CONFIG.TARGET_TPS}\`);
  console.log(\`VUs Used: \${TPS_CONFIG.EXPECTED_VUS}\`);
  console.log('==========================');
}`;
}

// Example usage configurations
const TPS_TEST_EXAMPLES = {
  // Low volume testing
  low_volume: {
    targetTPS: 10,
    duration: "2m",
    avgTransactionTime: 2,
    thinkTime: 1,
    description: "Basic functionality testing"
  },
  
  // Production simulation
  production_simulation: {
    targetTPS: 50,
    duration: "10m", 
    avgTransactionTime: 1.5,
    thinkTime: 2,
    description: "Real-world traffic simulation"
  },
  
  // Peak load testing
  peak_load: {
    targetTPS: 100,
    duration: "15m",
    avgTransactionTime: 1,
    thinkTime: 1,
    description: "Peak hour traffic simulation"
  },
  
  // Stress testing
  stress_test: {
    targetTPS: 200,
    duration: "10m",
    avgTransactionTime: 1,
    thinkTime: 0.5,
    description: "Breaking point analysis"
  },
  
  // Burst testing
  burst_test: {
    targetTPS: 500,
    duration: "5m",
    avgTransactionTime: 0.5,
    thinkTime: 0.2,
    description: "Sudden load spike simulation"
  }
};

module.exports = {
  TPS_PROFILES,
  calculateVUsForTPS,
  generateTPSBasedK6Script,
  TPS_TEST_EXAMPLES
};