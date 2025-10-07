import React, { useState, useEffect } from 'react';

const TPSConfigurationPanel = ({ onConfigurationChange, existingConfig = {} }) => {
  const [tpsConfig, setTpsConfig] = useState({
    testType: 'moderate_tps',
    targetTPS: 50,
    duration: '5m',
    avgTransactionTime: 2,
    thinkTime: 1,
    maxVUs: 500,
    customTPS: 50,
    ...existingConfig
  });

  const [calculatedVUs, setCalculatedVUs] = useState(null);
  const [tpsAnalysis, setTpsAnalysis] = useState(null);

  const TPS_PRESETS = {
    low_tps: {
      name: "Low TPS (10 TPS)",
      description: "Basic functionality testing",
      targetTPS: 10,
      duration: "2m",
      icon: "🐌",
      color: "#10B981"
    },
    moderate_tps: {
      name: "Moderate TPS (50 TPS)",
      description: "Normal production load",
      targetTPS: 50,
      duration: "5m", 
      icon: "🚶",
      color: "#3B82F6"
    },
    high_tps: {
      name: "High TPS (100 TPS)",
      description: "Peak hour simulation",
      targetTPS: 100,
      duration: "10m",
      icon: "🏃",
      color: "#F59E0B"
    },
    stress_tps: {
      name: "Stress TPS (200 TPS)",
      description: "Breaking point analysis",
      targetTPS: 200,
      duration: "15m",
      icon: "🔥",
      color: "#EF4444"
    },
    burst_tps: {
      name: "Burst TPS (500 TPS)",
      description: "Sudden load spike",
      targetTPS: 500,
      duration: "5m",
      icon: "💥",
      color: "#8B5CF6"
    },
    custom_tps: {
      name: "Custom TPS",
      description: "User-defined configuration",
      targetTPS: 0,
      duration: "10m",
      icon: "⚙️",
      color: "#6B7280"
    }
  };

  // Calculate VUs based on TPS configuration
  const calculateVUsForTPS = (targetTps, avgTransactionTime, thinkTime) => {
    const totalTimePerTransaction = avgTransactionTime + thinkTime;
    const requiredVUs = Math.ceil(targetTps * totalTimePerTransaction);
    
    return {
      recommendedVUs: requiredVUs,
      actualTPS: requiredVUs / totalTimePerTransaction,
      utilizationRate: (avgTransactionTime / totalTimePerTransaction) * 100,
      efficiency: (targetTps / (requiredVUs / totalTimePerTransaction)) * 100
    };
  };

  // Update calculations when config changes
  useEffect(() => {
    const currentTPS = tpsConfig.testType === 'custom_tps' ? tpsConfig.customTPS : TPS_PRESETS[tpsConfig.testType]?.targetTPS || 50;
    
    const vuCalc = calculateVUsForTPS(currentTPS, tpsConfig.avgTransactionTime, tpsConfig.thinkTime);
    const finalVUs = Math.min(vuCalc.recommendedVUs, tpsConfig.maxVUs);
    
    const analysis = {
      ...vuCalc,
      finalVUs,
      targetTPS: currentTPS,
      isVULimited: vuCalc.recommendedVUs > tpsConfig.maxVUs,
      actualTPS: finalVUs / (tpsConfig.avgTransactionTime + tpsConfig.thinkTime)
    };
    
    setCalculatedVUs(finalVUs);
    setTpsAnalysis(analysis);
    
    // Notify parent component
    onConfigurationChange && onConfigurationChange({
      ...tpsConfig,
      targetTPS: currentTPS,
      calculatedVUs: finalVUs,
      analysis
    });
  }, [tpsConfig, onConfigurationChange]);

  const handlePresetChange = (presetKey) => {
    const preset = TPS_PRESETS[presetKey];
    setTpsConfig(prev => ({
      ...prev,
      testType: presetKey,
      targetTPS: preset.targetTPS,
      duration: preset.duration
    }));
  };

  const handleConfigChange = (field, value) => {
    setTpsConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="tps-configuration-panel">
      <div className="panel-header">
        <h3>🎯 TPS Benchmark Configuration</h3>
        <p>Configure Transactions Per Second (TPS) instead of Virtual Users</p>
      </div>

      {/* TPS vs VU Explanation */}
      <div className="info-section">
        <div className="info-grid">
          <div className="info-card">
            <h4>👥 Virtual Users (VU)</h4>
            <p>Simulated concurrent users</p>
            <p>Focus: User behavior & sessions</p>
          </div>
          <div className="info-card">
            <h4>⚡ Transactions/Second (TPS)</h4>
            <p>Requests processed per second</p>
            <p>Focus: System throughput</p>
          </div>
        </div>
      </div>

      {/* TPS Preset Selection */}
      <div className="preset-section">
        <h4>📊 TPS Test Profiles</h4>
        <div className="preset-grid">
          {Object.entries(TPS_PRESETS).map(([key, preset]) => (
            <div
              key={key}
              className={`preset-card ${tpsConfig.testType === key ? 'selected' : ''}`}
              onClick={() => handlePresetChange(key)}
              style={{ borderColor: preset.color }}
            >
              <div className="preset-icon" style={{ color: preset.color }}>
                {preset.icon}
              </div>
              <div className="preset-info">
                <h5>{preset.name}</h5>
                <p>{preset.description}</p>
                {key !== 'custom_tps' && (
                  <div className="preset-stats">
                    <span>TPS: {preset.targetTPS}</span>
                    <span>Duration: {preset.duration}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom TPS Configuration */}
      {tpsConfig.testType === 'custom_tps' && (
        <div className="custom-config-section">
          <h4>⚙️ Custom TPS Configuration</h4>
          <div className="config-grid">
            <div className="config-field">
              <label>Target TPS:</label>
              <input
                type="number"
                value={tpsConfig.customTPS}
                onChange={(e) => handleConfigChange('customTPS', parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
            <div className="config-field">
              <label>Test Duration:</label>
              <select
                value={tpsConfig.duration}
                onChange={(e) => handleConfigChange('duration', e.target.value)}
              >
                <option value="1m">1 minute</option>
                <option value="2m">2 minutes</option>
                <option value="5m">5 minutes</option>
                <option value="10m">10 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="30m">30 minutes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Configuration */}
      <div className="advanced-config-section">
        <h4>🔧 Advanced Configuration</h4>
        <div className="config-grid">
          <div className="config-field">
            <label>
              Avg Transaction Time (seconds):
              <span className="help-text">Time for one complete USSD flow</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={tpsConfig.avgTransactionTime}
              onChange={(e) => handleConfigChange('avgTransactionTime', parseFloat(e.target.value))}
              min="0.1"
              max="10"
            />
          </div>
          <div className="config-field">
            <label>
              Think Time (seconds):
              <span className="help-text">Delay between user actions</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={tpsConfig.thinkTime}
              onChange={(e) => handleConfigChange('thinkTime', parseFloat(e.target.value))}
              min="0"
              max="10"
            />
          </div>
          <div className="config-field">
            <label>
              Max VUs:
              <span className="help-text">Maximum virtual users allowed</span>
            </label>
            <input
              type="number"
              value={tpsConfig.maxVUs}
              onChange={(e) => handleConfigChange('maxVUs', parseInt(e.target.value))}
              min="1"
              max="2000"
            />
          </div>
        </div>
      </div>

      {/* TPS Analysis Results */}
      {tpsAnalysis && (
        <div className="analysis-section">
          <h4>📊 TPS Analysis Results</h4>
          <div className="analysis-grid">
            <div className="analysis-card">
              <h5>🎯 Target TPS</h5>
              <div className="metric-value">{tpsAnalysis.targetTPS}</div>
              <div className="metric-unit">transactions/sec</div>
            </div>
            <div className="analysis-card">
              <h5>👥 Required VUs</h5>
              <div className="metric-value">{tpsAnalysis.finalVUs}</div>
              <div className="metric-unit">virtual users</div>
              {tpsAnalysis.isVULimited && (
                <div className="warning">⚠️ VU limited</div>
              )}
            </div>
            <div className="analysis-card">
              <h5>⚡ Actual TPS</h5>
              <div className="metric-value">{tpsAnalysis.actualTPS.toFixed(1)}</div>
              <div className="metric-unit">transactions/sec</div>
            </div>
            <div className="analysis-card">
              <h5>📈 Utilization</h5>
              <div className="metric-value">{tpsAnalysis.utilizationRate.toFixed(1)}%</div>
              <div className="metric-unit">CPU utilization</div>
            </div>
          </div>
          
          {tpsAnalysis.isVULimited && (
            <div className="warning-message">
              ⚠️ <strong>VU Limitation Detected:</strong> To achieve {tpsAnalysis.targetTPS} TPS, 
              you need {tpsAnalysis.recommendedVUs} VUs, but max is set to {tpsConfig.maxVUs}. 
              Actual TPS will be ~{tpsAnalysis.actualTPS.toFixed(1)}.
            </div>
          )}
        </div>
      )}

      {/* Formula Explanation */}
      <div className="formula-section">
        <h4>📐 TPS Calculation Formula</h4>
        <div className="formula-box">
          <code>
            TPS = VUs ÷ (Transaction Time + Think Time)
          </code>
          <br />
          <code>
            Required VUs = Target TPS × (Transaction Time + Think Time)
          </code>
        </div>
        <div className="formula-example">
          <strong>Example:</strong> For {tpsAnalysis?.targetTPS || 50} TPS with {tpsConfig.avgTransactionTime}s transaction time 
          and {tpsConfig.thinkTime}s think time = {calculatedVUs || 'N/A'} VUs needed
        </div>
      </div>

      <style jsx>{`
        .tps-configuration-panel {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 1000px;
        }

        .panel-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .panel-header h3 {
          color: #1F2937;
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .panel-header p {
          color: #6B7280;
          margin: 0;
        }

        .info-section {
          margin-bottom: 24px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .info-card {
          background: #F9FAFB;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
        }

        .info-card h4 {
          margin: 0 0 8px 0;
          color: #1F2937;
        }

        .info-card p {
          margin: 4px 0;
          color: #6B7280;
          font-size: 14px;
        }

        .preset-section {
          margin-bottom: 24px;
        }

        .preset-section h4 {
          margin-bottom: 16px;
          color: #1F2937;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .preset-card {
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .preset-card:hover {
          border-color: #3B82F6;
          background: #F8FAFC;
        }

        .preset-card.selected {
          border-color: currentColor;
          background: #F0F9FF;
        }

        .preset-icon {
          font-size: 24px;
        }

        .preset-info h5 {
          margin: 0 0 4px 0;
          color: #1F2937;
          font-size: 14px;
        }

        .preset-info p {
          margin: 0 0 8px 0;
          color: #6B7280;
          font-size: 12px;
        }

        .preset-stats {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #4B5563;
        }

        .preset-stats span {
          background: #E5E7EB;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .custom-config-section,
        .advanced-config-section {
          margin-bottom: 24px;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 6px;
        }

        .custom-config-section h4,
        .advanced-config-section h4 {
          margin: 0 0 16px 0;
          color: #1F2937;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .config-field {
          display: flex;
          flex-direction: column;
        }

        .config-field label {
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .help-text {
          font-weight: normal;
          color: #6B7280;
          font-size: 12px;
          display: block;
        }

        .config-field input,
        .config-field select {
          padding: 8px;
          border: 1px solid #D1D5DB;
          border-radius: 4px;
          font-size: 14px;
        }

        .config-field input:focus,
        .config-field select:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .analysis-section {
          margin-bottom: 24px;
          padding: 16px;
          background: #F0FDF4;
          border-radius: 6px;
        }

        .analysis-section h4 {
          margin: 0 0 16px 0;
          color: #1F2937;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .analysis-card {
          background: white;
          padding: 16px;
          border-radius: 6px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .analysis-card h5 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 14px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #059669;
          margin-bottom: 4px;
        }

        .metric-unit {
          font-size: 12px;
          color: #6B7280;
        }

        .warning {
          color: #F59E0B;
          font-size: 12px;
          font-weight: bold;
          margin-top: 4px;
        }

        .warning-message {
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          border-radius: 4px;
          padding: 12px;
          color: #92400E;
          font-size: 14px;
        }

        .formula-section {
          background: #F3F4F6;
          padding: 16px;
          border-radius: 6px;
        }

        .formula-section h4 {
          margin: 0 0 12px 0;
          color: #1F2937;
        }

        .formula-box {
          background: #1F2937;
          color: #F9FAFB;
          padding: 12px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          margin-bottom: 12px;
        }

        .formula-example {
          color: #4B5563;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default TPSConfigurationPanel;