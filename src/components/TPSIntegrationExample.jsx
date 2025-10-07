// Integration example: Adding TPS configuration to your existing K6 generator

// 1. Add TPS configuration to your React component
import TPSConfigurationPanel from './TPSConfigurationPanel';

// 2. Update your K6TestGenerator component
const K6TestGenerator = () => {
  const [testConfig, setTestConfig] = useState({
    // ... existing config
    testMode: 'vu', // 'vu' or 'tps'
    tpsConfig: null
  });

  const handleTestModeChange = (mode) => {
    setTestConfig(prev => ({
      ...prev,
      testMode: mode
    }));
  };

  const handleTPSConfigChange = (tpsConfig) => {
    setTestConfig(prev => ({
      ...prev,
      tpsConfig
    }));
  };

  return (
    <div className="k6-test-generator">
      {/* Existing configuration sections */}
      
      {/* Test Mode Selection */}
      <div className="test-mode-selection">
        <h3>🎯 Test Mode Configuration</h3>
        <div className="mode-buttons">
          <button 
            className={testConfig.testMode === 'vu' ? 'active' : ''}
            onClick={() => handleTestModeChange('vu')}
          >
            👥 Virtual Users (VU) Mode
          </button>
          <button 
            className={testConfig.testMode === 'tps' ? 'active' : ''}
            onClick={() => handleTestModeChange('tps')}
          >
            ⚡ Transactions/Second (TPS) Mode
          </button>
        </div>
      </div>

      {/* Conditional rendering based on test mode */}
      {testConfig.testMode === 'vu' && (
        <div className="vu-configuration">
          {/* Your existing VU-based configuration */}
          <VirtualUserConfiguration 
            config={testConfig}
            onChange={setTestConfig}
          />
        </div>
      )}

      {testConfig.testMode === 'tps' && (
        <div className="tps-configuration">
          {/* New TPS-based configuration */}
          <TPSConfigurationPanel
            existingConfig={testConfig.tpsConfig}
            onConfigurationChange={handleTPSConfigChange}
          />
        </div>
      )}

      {/* Generate K6 Script button */}
      <button 
        onClick={() => generateK6Script(testConfig)}
        className="generate-script-btn"
      >
        🚀 Generate {testConfig.testMode.toUpperCase()}-Based K6 Script
      </button>
    </div>
  );
};

// 3. Update your generateK6Script function
const generateK6Script = (config) => {
  if (config.testMode === 'tps') {
    return generateTPSBasedK6Script({
      targetTPS: config.tpsConfig.targetTPS,
      duration: config.tpsConfig.duration,
      avgTransactionTime: config.tpsConfig.avgTransactionTime,
      thinkTime: config.tpsConfig.thinkTime,
      maxVUs: config.tpsConfig.maxVUs,
      // ... other config
    });
  } else {
    // Generate traditional VU-based script
    return generateVUBasedK6Script(config);
  }
};

// 4. Example TPS-based K6 script generation
const generateTPSBasedK6Script = (tpsConfig) => {
  const { targetTPS, duration, avgTransactionTime, thinkTime, maxVUs } = tpsConfig;
  
  // Calculate required VUs
  const requiredVUs = Math.min(
    Math.ceil(targetTPS * (avgTransactionTime + thinkTime)),
    maxVUs
  );

  return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// TPS-focused metrics
const tpsActual = new Rate('tps_actual');
const transactionDuration = new Trend('transaction_duration');

export const options = {
  scenarios: {
    tps_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.floor(${requiredVUs} * 0.2) },
        { duration: '1m', target: Math.floor(${requiredVUs} * 0.5) },
        { duration: '1m', target: ${requiredVUs} },
        { duration: '${duration}', target: ${requiredVUs} },
        { duration: '1m', target: 0 }
      ]
    }
  },
  thresholds: {
    'tps_actual': ['rate>=${targetTPS * 0.9}'],
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.01']
  },
  tags: {
    test_type: 'tps_benchmark',
    target_tps: '${targetTPS}',
    expected_vus: '${requiredVUs}'
  }
};

// Your USSD flow implementation here
export default function () {
  const startTime = Date.now();
  
  // Execute USSD flow
  // ... your USSD testing logic
  
  const endTime = Date.now();
  const transactionTime = (endTime - startTime) / 1000;
  
  // Record metrics
  transactionDuration.add(transactionTime);
  tpsActual.add(1);
  
  // Calculate sleep time to maintain TPS
  const targetCycleTime = 1 / ${targetTPS} * __VU;
  const remainingSleep = Math.max(0, targetCycleTime - transactionTime);
  
  sleep(remainingSleep + ${thinkTime});
}`;
};

// 5. Add styling for the mode selection
const styles = `
.test-mode-selection {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.mode-buttons {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.mode-buttons button {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.mode-buttons button:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.mode-buttons button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}

.vu-configuration,
.tps-configuration {
  margin-bottom: 24px;
}

.generate-script-btn {
  width: 100%;
  padding: 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.generate-script-btn:hover {
  background: #059669;
}
`;

export { generateTPSBasedK6Script, TPSConfigurationPanel, styles };