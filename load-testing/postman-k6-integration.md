# 🚀 Running K6 Scripts from Postman

## 🎯 Method 1: Postman → K6 Conversion (Recommended)

### **Export Postman Collection → Import to K6**

#### **Step 1: Export from Postman**
```bash
# In Postman:
1. Click on your collection
2. Click "..." → Export
3. Choose "Collection v2.1" format
4. Save as: ussd-collection.json
```

#### **Step 2: Convert Postman to K6**
```bash
# Install postman-to-k6 converter
npm install -g @apideck/postman-to-k6

# Convert your collection
postman-to-k6 ussd-collection.json --output k6-from-postman.js

# Run the converted K6 script
k6 run k6-from-postman.js
```

## 🎯 Method 2: Trigger K6 from Postman (API Approach)

### **Setup K6 as API Service**

#### **Create K6 API Wrapper**
```javascript
// k6-api-server.js
const express = require('express');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

app.post('/run-k6-test', (req, res) => {
    const { testName, vus, duration, environment } = req.body;
    
    const k6Command = `k6 run \
        --vus ${vus || 10} \
        --duration ${duration || '30s'} \
        --env ENVIRONMENT=${environment || 'staging'} \
        --out json=results-${Date.now()}.json \
        /loadtest/ussd-load-test-enhanced.js`;
    
    exec(k6Command, (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: error.message, stderr });
        } else {
            res.json({ 
                status: 'completed',
                output: stdout,
                timestamp: new Date().toISOString()
            });
        }
    });
});

app.listen(3001, () => {
    console.log('K6 API Server running on port 3001');
});
```

#### **Postman Request to Trigger K6**
```json
POST http://your-server:3001/run-k6-test
Content-Type: application/json

{
    "testName": "ussd-load-test",
    "vus": 50,
    "duration": "5m",
    "environment": "staging"
}
```

## 🎯 Method 3: Postman Pre-request Script

### **Run K6 Before Postman Tests**
```javascript
// In Postman Pre-request Script tab:
const { exec } = require('child_process');

// Trigger K6 test
pm.sendRequest({
    url: 'http://your-k6-api:3001/run-k6-test',
    method: 'POST',
    header: {
        'Content-Type': 'application/json'
    },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            testName: 'ussd-pre-test',
            vus: 10,
            duration: '1m'
        })
    }
}, function (err, response) {
    if (err) {
        console.log('K6 test failed:', err);
    } else {
        console.log('K6 test completed:', response.json());
        // Store results for use in main request
        pm.environment.set('k6_test_status', response.json().status);
    }
});
```

## 🎯 Method 4: Newman + K6 Integration

### **Run Both Postman and K6 Together**
```bash
#!/bin/bash
# run-postman-k6-suite.sh

echo "🚀 Running Postman + K6 Test Suite"
echo "=================================="

# Step 1: Run Postman functional tests
echo "📋 Running Postman functional tests..."
newman run ussd-collection.json \
    --environment staging.json \
    --reporters cli,json \
    --reporter-json-export postman-results.json

# Check if Postman tests passed
if [ $? -eq 0 ]; then
    echo "✅ Postman tests passed! Starting K6 load tests..."
    
    # Step 2: Run K6 load tests
    k6 run \
        --out json=k6-results.json \
        --tag postman-validated=true \
        /loadtest/ussd-load-test-enhanced.js
    
    echo "✅ K6 load tests completed!"
    
    # Step 3: Generate combined report
    echo "📊 Generating combined report..."
    python3 generate-combined-report.py postman-results.json k6-results.json
    
else
    echo "❌ Postman tests failed. Skipping K6 load tests."
    exit 1
fi
```

## 🎯 Method 5: Postman Collection Runner

### **Create Postman Collection for K6 Control**

#### **Collection Structure:**
```
📁 USSD K6 Load Testing
├── 🔧 Setup
│   ├── Set Test Parameters
│   └── Validate Environment
├── 🚀 Execute Tests
│   ├── Start K6 Load Test
│   ├── Monitor Progress
│   └── Get Results
└── 📊 Reports
    ├── Generate Analysis
    └── Export Results
```

#### **Sample Postman Requests:**

**1. Set Test Parameters**
```javascript
// Pre-request Script
pm.environment.set('k6_vus', 50);
pm.environment.set('k6_duration', '5m');
pm.environment.set('k6_test_name', 'ussd-load-test');
pm.environment.set('timestamp', Date.now());
```

**2. Start K6 Load Test**
```http
POST http://{{k6_server}}/api/start-test
Content-Type: application/json

{
    "test_script": "ussd-load-test-enhanced.js",
    "options": {
        "vus": {{k6_vus}},
        "duration": "{{k6_duration}}",
        "tags": {
            "testid": "{{k6_test_name}}-{{timestamp}}",
            "environment": "{{environment}}",
            "triggered_by": "postman"
        }
    },
    "outputs": [
        "json=/results/{{k6_test_name}}-{{timestamp}}.json",
        "csv=/results/{{k6_test_name}}-{{timestamp}}.csv"
    ]
}
```

**3. Monitor Progress**
```javascript
// Test Script
pm.test("K6 test is running", function () {
    const response = pm.response.json();
    pm.expect(response.status).to.equal('running');
    
    // Store test ID for monitoring
    pm.environment.set('k6_test_id', response.test_id);
});

// Wait and check status
setTimeout(() => {
    pm.sendRequest({
        url: `http://{{k6_server}}/api/test-status/{{k6_test_id}}`,
        method: 'GET'
    }, function(err, response) {
        if (response.json().status === 'completed') {
            console.log('✅ K6 test completed successfully!');
        }
    });
}, 5000);
```

**4. Get Results**
```http
GET http://{{k6_server}}/api/test-results/{{k6_test_id}}
```

```javascript
// Test Script
pm.test("K6 results are available", function () {
    const results = pm.response.json();
    
    // Validate your excellent metrics
    pm.expect(results.metrics.flow_completion.rate).to.be.above(0.9);
    pm.expect(results.metrics.errors.rate).to.be.below(0.05);
    pm.expect(results.metrics.http_req_duration.p95).to.be.below(3000);
    
    console.log(`✅ Flow Completion: ${results.metrics.flow_completion.rate * 100}%`);
    console.log(`⚡ P95 Response Time: ${results.metrics.http_req_duration.p95}ms`);
    console.log(`❌ Error Rate: ${results.metrics.errors.rate * 100}%`);
});
```

## 🎯 Method 6: GitHub Actions + Postman

### **Automated Pipeline**
```yaml
# .github/workflows/postman-k6-pipeline.yml
name: Postman + K6 Testing Pipeline

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 8 * * 1-5'  # Run weekdays at 8 AM

jobs:
  test-suite:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Postman Collection
      uses: matt-ball/newman-action@master
      with:
        collection: ussd-collection.json
        environment: staging.json
        
    - name: Run K6 Load Tests
      uses: grafana/k6-action@v0.3.0
      with:
        filename: ussd-load-test-enhanced.js
        flags: --out json=results.json
        
    - name: Generate Reports
      run: |
        python3 analyze-k6-files.sh
        
    - name: Upload Results
      uses: actions/upload-artifact@v3
      with:
        name: test-results
        path: |
          results.json
          *.html
          *.csv
```

## 🚀 **Quick Setup Guide**

### **Option A: Simple API Trigger (Recommended)**

1. **Create K6 API server** (copy k6-api-server.js to your server)
2. **Start the server**: `node k6-api-server.js`
3. **In Postman**: Create POST request to trigger K6
4. **Run your collection**: Postman → K6 → Results

### **Option B: Collection Conversion**

1. **Export Postman collection**
2. **Install converter**: `npm install -g @apideck/postman-to-k6`
3. **Convert**: `postman-to-k6 collection.json --output k6-script.js`
4. **Run**: `k6 run k6-script.js`

## 💡 **Benefits of Postman + K6 Integration:**

✅ **Unified Testing**: Functional + Load tests in one workflow  
✅ **CI/CD Integration**: Automated testing pipeline  
✅ **Business Validation**: Validate before load testing  
✅ **Team Collaboration**: Postman collections are shareable  
✅ **Monitoring**: Continuous testing with schedulers  

## 🎯 **Your Use Case:**

Given your excellent K6 results (100% success, 0% errors), you could:

1. **Create Postman collection** for your USSD endpoints
2. **Run functional tests first** (validate business logic)
3. **Trigger K6 load tests** (validate performance)
4. **Generate combined reports** (functional + performance)

This gives you **complete test coverage** from a single Postman interface! 🚀
