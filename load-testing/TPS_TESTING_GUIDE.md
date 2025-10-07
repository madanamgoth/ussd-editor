# TPS (Transactions Per Second) Load Testing Guide

## 🎯 **TPS vs VU: Understanding the Difference**

### **Virtual Users (VU)**
```
What: Number of simulated concurrent users
Focus: User behavior and session management  
Use Case: Simulating real user patterns with think time
Example: 100 VUs = 100 people using system simultaneously
```

### **Transactions Per Second (TPS)**
```
What: Number of completed requests per second
Focus: System throughput and processing capacity
Use Case: Measuring maximum system performance
Example: 1000 TPS = 1000 USSD requests processed per second
```

## 📊 **TPS Calculation Formula**

### **Basic Formula**
```
TPS = VUs ÷ (Transaction Time + Think Time)

Required VUs = Target TPS × (Transaction Time + Think Time)
```

### **Example Calculations**

| Target TPS | Transaction Time | Think Time | Required VUs | Actual TPS |
|------------|------------------|------------|--------------|------------|
| 10 TPS     | 2s              | 1s         | 30 VUs       | 10 TPS     |
| 50 TPS     | 2s              | 1s         | 150 VUs      | 50 TPS     |
| 100 TPS    | 1s              | 1s         | 200 VUs      | 100 TPS    |
| 200 TPS    | 1s              | 0.5s       | 300 VUs      | 200 TPS    |
| 500 TPS    | 0.5s            | 0.2s       | 350 VUs      | 500 TPS    |

## 🚀 **TPS Test Profiles**

### **1. Low TPS (10 TPS) - Basic Testing**
```javascript
Target: 10 transactions/second
Duration: 2 minutes
VUs Needed: ~30
Use Case: Basic functionality validation
Resource Usage: Minimal
```

### **2. Moderate TPS (50 TPS) - Production Simulation**
```javascript
Target: 50 transactions/second
Duration: 5 minutes  
VUs Needed: ~150
Use Case: Normal production load simulation
Resource Usage: Moderate
```

### **3. High TPS (100 TPS) - Peak Load**
```javascript
Target: 100 transactions/second
Duration: 10 minutes
VUs Needed: ~200-300
Use Case: Peak hour traffic simulation
Resource Usage: High
```

### **4. Stress TPS (200 TPS) - Breaking Point**
```javascript
Target: 200 transactions/second
Duration: 15 minutes
VUs Needed: ~300-600
Use Case: System capacity analysis
Resource Usage: Very High
```

### **5. Burst TPS (500 TPS) - Spike Testing**
```javascript
Target: 500 transactions/second
Duration: 5 minutes
VUs Needed: ~350-1000
Use Case: Sudden load spike simulation
Resource Usage: Maximum
```

## ⚙️ **Configuration Parameters**

### **Transaction Time**
- **Definition**: Time to complete one full USSD flow
- **Typical Range**: 0.5s - 5s
- **USSD Average**: 1-2 seconds
- **Factors**: Network latency, processing time, response size

### **Think Time**
- **Definition**: Delay between user actions (realistic user behavior)
- **Typical Range**: 0.2s - 10s
- **USSD Average**: 0.5-2 seconds
- **Factors**: User reading time, decision making, typing speed

### **Max VUs Limit**
- **Purpose**: Prevent resource exhaustion
- **Recommendation**: Set based on available memory/CPU
- **Formula**: `Max VUs = Available Memory ÷ Memory per VU`
- **Typical Range**: 100-2000 VUs

## 📈 **TPS Benchmarking Scenarios**

### **Scenario 1: USSD Banking Service**
```yaml
Service Type: Mobile Banking
Expected TPS: 50-100 TPS
Transaction Flow:
  - Dial *123#
  - Enter PIN
  - Select Service (Send Money)
  - Enter Amount
  - Enter Recipient
  - Confirm Transaction
Average Time: 15-30 seconds
Think Time: 2-5 seconds per step
```

### **Scenario 2: USSD Bill Payment**
```yaml
Service Type: Bill Payment
Expected TPS: 30-80 TPS
Transaction Flow:
  - Dial *456#
  - Enter PIN
  - Select Bill Type
  - Enter Amount
  - Confirm Payment
Average Time: 10-20 seconds
Think Time: 1-3 seconds per step
```

### **Scenario 3: USSD Balance Inquiry**
```yaml
Service Type: Account Balance
Expected TPS: 100-200 TPS
Transaction Flow:
  - Dial *789#
  - Enter PIN
  - View Balance
Average Time: 5-10 seconds
Think Time: 1-2 seconds per step
```

## 🔧 **TPS Configuration Examples**

### **Example 1: Production Load Testing**
```javascript
const tpsConfig = {
  targetTPS: 75,
  duration: "10m",
  avgTransactionTime: 2.0,
  thinkTime: 1.5,
  maxVUs: 500
};

// Results:
// Required VUs: 75 × (2.0 + 1.5) = 262.5 ≈ 263 VUs
// Actual TPS: 263 ÷ 3.5 = 75.1 TPS
```

### **Example 2: Stress Testing**
```javascript
const tpsConfig = {
  targetTPS: 150,
  duration: "15m", 
  avgTransactionTime: 1.5,
  thinkTime: 0.8,
  maxVUs: 800
};

// Results:
// Required VUs: 150 × (1.5 + 0.8) = 345 VUs
// Actual TPS: 345 ÷ 2.3 = 150 TPS
```

### **Example 3: Burst Testing**
```javascript
const tpsConfig = {
  targetTPS: 300,
  duration: "5m",
  avgTransactionTime: 1.0,
  thinkTime: 0.5,
  maxVUs: 1000
};

// Results:
// Required VUs: 300 × (1.0 + 0.5) = 450 VUs
// Actual TPS: 450 ÷ 1.5 = 300 TPS
```

## 📊 **TPS Monitoring Metrics**

### **Key Performance Indicators**
```yaml
Primary Metrics:
  - Actual TPS Achieved
  - Response Time (P95, P99)
  - Error Rate
  - Throughput (requests/second)

Secondary Metrics:
  - VU Utilization Rate
  - Connection Time
  - Time to First Byte (TTFB)
  - Memory Usage per VU

Business Metrics:
  - Transaction Success Rate
  - User Experience Score
  - System Availability
  - Cost per Transaction
```

### **TPS Thresholds**
```javascript
thresholds: {
  // TPS Performance
  'tps_actual': ['rate>=90%'],           // Achieve 90% of target TPS
  'tps_target_achievement': ['rate>=0.9'], // 90% requests meet TPS target
  
  // Response Time
  'http_req_duration': ['p(95)<3000'],   // 95% under 3 seconds
  'transaction_duration': ['p(99)<5000'], // 99% under 5 seconds
  
  // Error Rates
  'http_req_failed': ['rate<0.01'],      // Less than 1% errors
  'checks': ['rate>0.95'],               // 95% successful validations
  
  // System Stability
  'http_req_connecting': ['p(95)<1000'], // Connection time
  'http_req_receiving': ['p(95)<1000']   // Response receiving time
}
```

## 🎯 **TPS Testing Best Practices**

### **1. Baseline Testing**
```
Start with low TPS (10-20)
Establish baseline performance
Identify system bottlenecks
Validate test environment
```

### **2. Gradual Ramp-Up**
```
Increase TPS incrementally (10 → 25 → 50 → 100)
Monitor system behavior at each level
Identify breaking points
Document performance degradation points
```

### **3. Realistic Scenarios**
```
Use actual transaction flows
Include proper think times
Simulate real user behavior
Test with production-like data
```

### **4. Resource Monitoring**
```
Monitor CPU, Memory, Network
Track database performance
Watch for resource saturation
Identify infrastructure limits
```

## 🚨 **Common TPS Testing Issues**

### **Issue 1: VU Limitation**
```
Problem: Can't achieve target TPS due to VU limit
Solution: Increase maxVUs or reduce transaction time
Formula: Required VUs = Target TPS × (Trans Time + Think Time)
```

### **Issue 2: Resource Saturation**
```
Problem: System resources maxed out before reaching target TPS
Solution: Scale infrastructure or optimize application
Monitoring: CPU, Memory, Network, Database connections
```

### **Issue 3: Unrealistic Transaction Times**
```
Problem: Transaction times too fast/slow
Solution: Measure real transaction times in production
Method: Use APM tools or manual testing
```

### **Issue 4: Network Bottlenecks**
```
Problem: Network bandwidth limiting TPS
Solution: Test with adequate network capacity
Check: Network utilization, latency, packet loss
```

## 📋 **TPS Testing Checklist**

### **Pre-Test Preparation**
- [ ] Define target TPS based on business requirements
- [ ] Measure actual transaction times in production
- [ ] Calculate required VUs using formula
- [ ] Prepare realistic test data
- [ ] Set up monitoring for all system components
- [ ] Define success criteria and thresholds

### **During Test Execution**
- [ ] Monitor actual TPS vs target TPS
- [ ] Watch for error rate increases
- [ ] Check response time degradation
- [ ] Monitor system resource utilization
- [ ] Log any performance anomalies
- [ ] Document breaking points

### **Post-Test Analysis**
- [ ] Analyze TPS achievement vs target
- [ ] Review response time distributions
- [ ] Identify performance bottlenecks
- [ ] Calculate system capacity limits
- [ ] Document recommendations
- [ ] Plan optimization strategies

## 🎉 **Success Criteria**

### **TPS Achievement**
```
✅ Achieve 90%+ of target TPS
✅ Maintain stable TPS throughout test duration
✅ Error rate < 1%
✅ P95 response time < 3 seconds
```

### **System Stability**
```
✅ No memory leaks or resource exhaustion
✅ Consistent performance under sustained load
✅ Graceful degradation under stress
✅ Quick recovery after load removal
```

### **Business Value**
```
✅ Meet business transaction volume requirements
✅ Provide acceptable user experience
✅ Demonstrate system scalability
✅ Validate infrastructure capacity
```

---

**Remember**: TPS testing focuses on **system throughput** while VU testing focuses on **user experience**. Choose the approach that matches your testing objectives!