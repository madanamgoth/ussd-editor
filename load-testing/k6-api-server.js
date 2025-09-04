const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Store running tests
const runningTests = new Map();

// API endpoint to start K6 test
app.post('/api/start-k6-test', (req, res) => {
    console.log('🚀 Received K6 test request from Postman');
    
    const {
        testName = 'ussd-load-test',
        vus = 10,
        duration = '30s',
        environment = 'staging',
        testScript = 'ussd-load-test-enhanced.js',
        tags = {},
        outputs = []
    } = req.body;

    const testId = `test-${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Prepare K6 command
    let k6Command = [
        'run',
        `--vus`, vus.toString(),
        `--duration`, duration,
        `--tag`, `testid=${testName}-${timestamp}`,
        `--tag`, `environment=${environment}`,
        `--tag`, `triggered_by=postman`,
        `--summary-trend-stats=min,avg,med,max,p(90),p(95),p(99)`,
        `--summary-time-unit=ms`
    ];

    // Add custom tags
    Object.entries(tags).forEach(([key, value]) => {
        k6Command.push('--tag', `${key}=${value}`);
    });

    // Add outputs
    const defaultOutputs = [
        `json=/home/mobiquity/loadtest/${testName}-${timestamp}.json`,
        `--summary-export=/home/mobiquity/loadtest/${testName}-summary-${timestamp}.json`
    ];
    
    const allOutputs = outputs.length > 0 ? outputs : defaultOutputs;
    allOutputs.forEach(output => {
        if (output.startsWith('--')) {
            k6Command.push(output);
        } else {
            k6Command.push('--out', output);
        }
    });

    // Add test script path
    k6Command.push(`/home/mobiquity/loadtest/${testScript}`);

    console.log('📋 K6 Command:', ['docker', 'run', '--rm', '--network', 'host', '-v', '/home/mobiquity/loadtest:/loadtest', 'grafana/k6', ...k6Command].join(' '));

    // Start K6 test as Docker container
    const k6Process = spawn('docker', [
        'run', '--rm', '--network', 'host',
        '-v', '/home/mobiquity/loadtest:/loadtest',
        'grafana/k6',
        ...k6Command
    ]);

    // Store test info
    const testInfo = {
        id: testId,
        testName,
        startTime: new Date(),
        status: 'running',
        process: k6Process,
        command: k6Command,
        outputs: allOutputs,
        logs: [],
        config: { vus, duration, environment, testScript }
    };

    runningTests.set(testId, testInfo);

    let output = '';
    let errorOutput = '';

    // Capture stdout
    k6Process.stdout.on('data', (data) => {
        const logLine = data.toString();
        output += logLine;
        testInfo.logs.push({ type: 'stdout', timestamp: new Date(), message: logLine });
        console.log('K6 STDOUT:', logLine.trim());
    });

    // Capture stderr
    k6Process.stderr.on('data', (data) => {
        const logLine = data.toString();
        errorOutput += logLine;
        testInfo.logs.push({ type: 'stderr', timestamp: new Date(), message: logLine });
        console.log('K6 STDERR:', logLine.trim());
    });

    // Handle process completion
    k6Process.on('close', (code) => {
        testInfo.status = code === 0 ? 'completed' : 'failed';
        testInfo.endTime = new Date();
        testInfo.duration = testInfo.endTime - testInfo.startTime;
        testInfo.exitCode = code;
        testInfo.output = output;
        testInfo.errorOutput = errorOutput;

        console.log(`✅ K6 test ${testId} ${testInfo.status} with exit code ${code}`);

        // Try to parse results if available
        try {
            const resultsFile = `/home/mobiquity/loadtest/${testName}-${timestamp}.json`;
            if (fs.existsSync(resultsFile)) {
                testInfo.resultsFile = resultsFile;
                console.log(`📊 Results saved to: ${resultsFile}`);
            }
        } catch (err) {
            console.log('⚠️ Could not locate results file:', err.message);
        }
    });

    // Handle process errors
    k6Process.on('error', (err) => {
        testInfo.status = 'error';
        testInfo.error = err.message;
        console.error('❌ K6 process error:', err);
    });

    // Respond immediately with test info
    res.json({
        success: true,
        message: 'K6 test started successfully',
        testId: testId,
        status: 'running',
        config: testInfo.config,
        startTime: testInfo.startTime,
        estimatedDuration: duration
    });
});

// API endpoint to check test status
app.get('/api/test-status/:testId', (req, res) => {
    const { testId } = req.params;
    const testInfo = runningTests.get(testId);

    if (!testInfo) {
        return res.status(404).json({
            success: false,
            message: 'Test not found'
        });
    }

    res.json({
        success: true,
        testId: testId,
        status: testInfo.status,
        startTime: testInfo.startTime,
        endTime: testInfo.endTime,
        duration: testInfo.duration,
        config: testInfo.config,
        recentLogs: testInfo.logs.slice(-10) // Last 10 log entries
    });
});

// API endpoint to get test results
app.get('/api/test-results/:testId', (req, res) => {
    const { testId } = req.params;
    const testInfo = runningTests.get(testId);

    if (!testInfo) {
        return res.status(404).json({
            success: false,
            message: 'Test not found'
        });
    }

    if (testInfo.status === 'running') {
        return res.json({
            success: false,
            message: 'Test is still running',
            status: testInfo.status
        });
    }

    // Try to read results file
    let results = null;
    if (testInfo.resultsFile && fs.existsSync(testInfo.resultsFile)) {
        try {
            const resultsContent = fs.readFileSync(testInfo.resultsFile, 'utf8');
            const lines = resultsContent.trim().split('\n');
            const metrics = {};
            
            // Parse K6 JSON output
            lines.forEach(line => {
                try {
                    const entry = JSON.parse(line);
                    if (entry.data && entry.data.type === 'Point') {
                        const metric = entry.data.metric;
                        if (!metrics[metric]) {
                            metrics[metric] = [];
                        }
                        metrics[metric].push(entry.data.value);
                    }
                } catch (parseErr) {
                    // Skip invalid JSON lines
                }
            });

            // Calculate summary statistics
            const summary = {};
            Object.entries(metrics).forEach(([metric, values]) => {
                if (values.length > 0) {
                    values.sort((a, b) => a - b);
                    summary[metric] = {
                        count: values.length,
                        min: values[0],
                        max: values[values.length - 1],
                        avg: values.reduce((a, b) => a + b, 0) / values.length,
                        p50: values[Math.floor(values.length * 0.5)],
                        p95: values[Math.floor(values.length * 0.95)],
                        p99: values[Math.floor(values.length * 0.99)]
                    };
                }
            });

            results = {
                raw_metrics: metrics,
                summary: summary,
                total_data_points: lines.length
            };

        } catch (err) {
            console.error('Error parsing results file:', err);
        }
    }

    res.json({
        success: true,
        testId: testId,
        status: testInfo.status,
        startTime: testInfo.startTime,
        endTime: testInfo.endTime,
        duration: testInfo.duration,
        exitCode: testInfo.exitCode,
        config: testInfo.config,
        output: testInfo.output,
        errorOutput: testInfo.errorOutput,
        resultsFile: testInfo.resultsFile,
        results: results
    });
});

// API endpoint to list all tests
app.get('/api/tests', (req, res) => {
    const tests = Array.from(runningTests.values()).map(test => ({
        id: test.id,
        testName: test.testName,
        status: test.status,
        startTime: test.startTime,
        endTime: test.endTime,
        duration: test.duration,
        config: test.config
    }));

    res.json({
        success: true,
        tests: tests,
        total: tests.length
    });
});

// API endpoint to stop a running test
app.post('/api/stop-test/:testId', (req, res) => {
    const { testId } = req.params;
    const testInfo = runningTests.get(testId);

    if (!testInfo) {
        return res.status(404).json({
            success: false,
            message: 'Test not found'
        });
    }

    if (testInfo.status !== 'running') {
        return res.json({
            success: false,
            message: 'Test is not running',
            status: testInfo.status
        });
    }

    // Kill the process
    testInfo.process.kill('SIGTERM');
    testInfo.status = 'stopped';
    testInfo.endTime = new Date();

    res.json({
        success: true,
        message: 'Test stopped successfully',
        testId: testId
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'K6 API Server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve simple web interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>K6 API Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #007bff; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: white; }
        .post { background: #28a745; }
        .get { background: #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 K6 API Server</h1>
            <p>Trigger K6 load tests from Postman or any HTTP client</p>
        </div>
        
        <h2>📋 Available Endpoints</h2>
        
        <div class="endpoint">
            <span class="method post">POST</span> <code>/api/start-k6-test</code>
            <p>Start a new K6 load test</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/test-status/:testId</code>
            <p>Check the status of a running test</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/test-results/:testId</code>
            <p>Get results of a completed test</p>
        </div>
        
        <div class="endpoint">
            <span class="method get">GET</span> <code>/api/tests</code>
            <p>List all tests</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span> <code>/api/stop-test/:testId</code>
            <p>Stop a running test</p>
        </div>
        
        <h2>🎯 Example Postman Request</h2>
        <pre>{
  "testName": "ussd-load-test",
  "vus": 50,
  "duration": "5m",
  "environment": "staging",
  "testScript": "ussd-load-test-enhanced.js",
  "tags": {
    "version": "v2.0",
    "team": "qa"
  }
}</pre>
        
        <p><strong>Server Status:</strong> ✅ Running on port 3001</p>
        <p><strong>Health Check:</strong> <a href="/health">/health</a></p>
    </div>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 K6 API Server started successfully!');
    console.log(`📊 Server running on: http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('🎯 Ready to receive K6 test requests from Postman!');
    console.log('📋 Use POST /api/start-k6-test to trigger tests');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    
    // Stop all running tests
    runningTests.forEach((testInfo, testId) => {
        if (testInfo.status === 'running') {
            testInfo.process.kill('SIGTERM');
            console.log(`🛑 Stopped test: ${testId}`);
        }
    });
    
    process.exit(0);
});

module.exports = app;
