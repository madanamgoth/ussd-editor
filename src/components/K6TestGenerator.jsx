import React, { useState } from 'react';
import { exportToFlowFormat } from '../utils/flowUtils';

// Note: For now, we'll inline the generator logic since module imports are complex in React
// TODO: Convert to ES modules or use dynamic imports

const K6TestGenerator = ({ nodes, edges, onClose }) => {
  const [config, setConfig] = useState({
    baseUrl: 'http://host.docker.internal:9401',
    endpoint: '/MenuManagement/RequestReceiver',
    login: 'Ussd_Bearer1',
    password: 'test',
    phonePrefix: '777',
    sessionIdPrefix: '99',
    dialCode: '123', // Default dial code
    loadProfile: 'moderate',
    testDuration: '5m',
    maxUsers: 50,
    rampUpTime: '1m',
    // TPS Configuration
    testMode: 'vu', // 'vu' or 'tps'
    tpsConfig: {
      targetTPS: 50,
      duration: '5m',
      avgTransactionTime: 2,
      thinkTime: 1,
      maxVUs: 500,
      testType: 'moderate_tps'
    },
    // Dynamic input configuration
    dynamicInputs: {
      enableSmartInputs: true,
      amountRange: { min: 10, max: 5000 },
      pinLength: 4,
      receiverPrefixes: ['777', '778', '779', '770'],
      customAmounts: [25, 50, 100, 200, 500, 1000, 2000, 5000],
      accountLength: { min: 8, max: 12 },
      referenceFormat: 'alphanumeric',
      customMappings: ['BALANCE:amount', 'OTP:pin', 'BENEFICIARY:phone', 'CARD:account']
    }
  });

  // State for dynamic menu configurations
  const [dynamicMenus, setDynamicMenus] = useState({});

  const [generatedScript, setGeneratedScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flowStoreAttributes, setFlowStoreAttributes] = useState([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [testCases, setTestCases] = useState([]);

  // Extract actual storeAttributes from the flow
  const extractStoreAttributesFromFlow = (nodes) => {
    const storeAttributes = new Set();
    
    nodes.forEach(node => {
      // Check both variableName and storeAttribute for compatibility
      let attr = null;
      
      if (node.data && node.data.config) {
        // Try variableName first (React Flow format)
        attr = node.data.config.variableName;
        
        // Fallback to storeAttribute (exported format)
        if (!attr) {
          attr = node.data.config.storeAttribute;
        }
      }
      
      if (attr && attr.trim() !== '') {
        storeAttributes.add(attr.trim());
      }
    });
    
    console.log('Found storeAttributes:', Array.from(storeAttributes));
    return Array.from(storeAttributes);
  };

  // Update flowStoreAttributes when nodes change
  React.useEffect(() => {
    const attributes = extractStoreAttributesFromFlow(nodes);
    setFlowStoreAttributes(attributes);
    
    // Initialize dynamic input config for actual attributes
    const newDynamicInputs = { ...config.dynamicInputs };
    
    attributes.forEach(attr => {
      if (!newDynamicInputs.attributeConfigs) {
        newDynamicInputs.attributeConfigs = {};
      }
      
      if (!newDynamicInputs.attributeConfigs[attr]) {
        // Smart defaults based on attribute name patterns (no hardcoding)
        const attrLower = attr.toLowerCase();
        
        if (attrLower.includes('amount') || attrLower.includes('money') || attrLower.includes('balance')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'amount',
            values: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000]
          };
        } else if (attrLower.includes('pin') || attrLower.includes('password') || attrLower.includes('secret')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'pin',
            values: ['1234', '5678', '1111', '0000', '9999', '1122']
          };
        } else if (attrLower.includes('phone') || attrLower.includes('msisdn') || attrLower.includes('mobile') || attrLower.includes('number')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'phone',
            prefixes: ['777', '778', '779', '770'],
            length: 10
          };
        } else if (attrLower.includes('account') || attrLower.includes('acc')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'account',
            values: ['123456789', '987654321', '111222333', '444555666']
          };
        } else if (attrLower.includes('name') || attrLower.includes('beneficiary')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'name',
            values: ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson']
          };
        } else if (attrLower.includes('reference') || attrLower.includes('ref') || attrLower.includes('code')) {
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'reference',
            values: ['REF001', 'TXN123', 'CODE456', 'REF789']
          };
        } else {
          // Generic configuration for any other attribute
          newDynamicInputs.attributeConfigs[attr] = {
            type: 'custom',
            values: [`${attr}_VALUE1`, `${attr}_VALUE2`, `${attr}_VALUE3`]
          };
        }
      }
    });
    
    setConfig(prev => ({
      ...prev,
      dynamicInputs: newDynamicInputs
    }));
  }, [nodes]);

  const loadProfiles = {
    light: {
      name: 'Light Load',
      description: 'Low traffic simulation (5-10 users)',
      maxUsers: 10,
      duration: '2m'
    },
    moderate: {
      name: 'Moderate Load',
      description: 'Normal traffic simulation (20-50 users)',
      maxUsers: 50,
      duration: '5m'
    },
    heavy: {
      name: 'Heavy Load',
      description: 'High traffic simulation (100-200 users)',
      maxUsers: 200,
      duration: '10m'
    },
    stress: {
      name: 'Stress Test',
      description: 'Breaking point test (500+ users)',
      maxUsers: 500,
      duration: '15m'
    }
  };

  // Helper functions for test case generation
  const getNodeType = (node) => {
    const type = node.type || (node.data && node.data.type) || 'UNKNOWN';
    return type.toUpperCase();
  };
  
  const getStartInput = (node) => {
    if (node.data && node.data.config && node.data.config.ussdCode) {
      return node.data.config.ussdCode;
    }
    return '*123#';
  };

  // Detect DYNAMIC-MENU nodes and initialize their configurations
  const detectDynamicMenus = () => {
    const dynamicMenuNodes = nodes.filter(node => 
      getNodeType(node) === 'DYNAMIC-MENU'
    );
    
    const menuConfigs = {};
    dynamicMenuNodes.forEach(node => {
      if (!dynamicMenus[node.id]) {
        menuConfigs[node.id] = {
          nodeId: node.id,
          nodeName: node.data?.config?.name || `Dynamic Menu ${node.id}`,
          menuContent: '', // User will input the actual menu content
          defaultContent: 'Please select an option:', // Fallback
          sampleContent: '1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge\n4.Gas Pipeline Service'
        };
      } else {
        menuConfigs[node.id] = dynamicMenus[node.id];
      }
    });
    
    setDynamicMenus(menuConfigs);
    return dynamicMenuNodes;
  };

  // Update dynamic menu content
  const updateDynamicMenuContent = (nodeId, content) => {
    setDynamicMenus(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        menuContent: content
      }
    }));
  };

  // React effect to detect dynamic menus when nodes change
  React.useEffect(() => {
    detectDynamicMenus();
  }, [nodes]);

  // Auto-calculate TPS metrics when TPS config changes
  React.useEffect(() => {
    if (config.testMode === 'tps') {
      const { targetTPS, avgTransactionTime, thinkTime, maxVUs } = config.tpsConfig;
      const totalTime = avgTransactionTime + thinkTime;
      const requiredVUs = Math.ceil(targetTPS * totalTime);
      const finalVUs = Math.min(requiredVUs, maxVUs);
      const actualTPS = finalVUs / totalTime;
      
      // Auto-update TPS config with calculated values
      setConfig(prev => ({
        ...prev,
        tpsConfig: {
          ...prev.tpsConfig,
          calculatedVUs: finalVUs,
          actualTPS: actualTPS,
          isVULimited: requiredVUs > maxVUs
        }
      }));
    }
  }, [config.testMode, config.tpsConfig.targetTPS, config.tpsConfig.avgTransactionTime, config.tpsConfig.thinkTime, config.tpsConfig.maxVUs]);

  // Generate all possible test case combinations using new graph-based approach
  const generateAllTestCases = () => {
    try {
      console.log('🔍 Generating test cases using Canvas Graph structure...');
      
      // Find START and END nodes
      const startNodes = nodes.filter(node => 
        node.type === 'start' || (node.data && node.data.type === 'START')
      );
      
      if (startNodes.length === 0) {
        console.log('No START nodes found for test case generation');
        setTestCases([]);
        return [];
      }
      
      const allTestCases = [];
      
      startNodes.forEach(startNode => {
        const paths = findPathsFromStart(startNode, nodes, edges);
        console.log(`Found ${paths.length} paths for START node ${startNode.id}`);
        
        paths.forEach((path, pathIndex) => {
          const testCase = {
            id: allTestCases.length + 1,
            name: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
            description: createTestCaseDescription(path),
            steps: path.map((node, nodeIndex) => {
              if (nodeIndex === path.length - 1) return null; // Skip last node (no next step)
              
              const nextNode = path[nodeIndex + 1];
              const nodeType = getNodeType(node);
              const nextNodeType = getNodeType(nextNode);
              
              let action = '';
              let expectedResult = '';
              
              // Create action description
              switch (nodeType) {
                case 'START':
                  action = `Dial USSD code: ${getStartInput(node)}`;
                  break;
                case 'MENU':
                  action = `Select menu option: 1`;
                  break;
                case 'INPUT':
                  const storeAttr = node.data?.config?.variableName || 'input';
                  action = `Enter ${storeAttr}: dynamic value`;
                  break;
                case 'DYNAMIC-MENU':
                  action = `Select from dynamic menu: dynamic option`;
                  break;
                case 'ACTION':
                  action = `Process action: API call`;
                  break;
                default:
                  action = `Navigate from ${nodeType}`;
              }
              
              // Create expected result
              if (nextNode.data && nextNode.data.config && nextNode.data.config.prompts && nextNode.data.config.prompts.en) {
                expectedResult = nextNode.data.config.prompts.en;
              } else {
                switch (nextNodeType) {
                  case 'INPUT':
                    expectedResult = 'Please enter your input:';
                    break;
                  case 'MENU':
                    expectedResult = 'Please select an option:';
                    break;
                  case 'END':
                    expectedResult = 'Thank you for using our service!';
                    break;
                  default:
                    expectedResult = 'Continue to next step';
                }
              }
              
              return {
                stepNumber: nodeIndex + 1,
                action: action,
                expectedResult: expectedResult,
                input: nodeType === 'INPUT' ? '*' : (nodeType === 'START' ? getStartInput(node) : '1'),
                nodeType: nodeType
              };
            }).filter(step => step !== null) // Remove null entries
          };
          
          allTestCases.push(testCase);
        });
      });
      
      console.log('📊 Test case generation results:', {
        testCases: allTestCases.length,
        startNodes: startNodes.length
      });
      
      setTestCases(allTestCases);
      return allTestCases;
    } catch (error) {
      console.error('❌ Error generating test cases:', error);
      setTestCases([]);
      return [];
    }
  };

  // Create test case description from path
  const createTestCaseDescription = (path) => {
    const pathSteps = path.map(node => {
      const nodeType = getNodeType(node);
      let stepDesc = nodeType;
      
      if (nodeType === 'INPUT' && node.data?.config?.variableName) {
        stepDesc += `(${node.data.config.variableName})`;
      } else if (nodeType === 'START' && node.data?.config?.ussdCode) {
        stepDesc += `(${node.data.config.ussdCode})`;
      }
      
      return stepDesc;
    }).join(' → ');
    
    return `Flow path: ${pathSteps}`;
  };

  // Create steps visualization from K6 data structure
  const createStepsFromInputs = (inputs, inputMetadata, inputCombination = {}) => {
    console.log('createStepsFromInputs called with:', { inputs, inputMetadata, inputCombination });
    
    if (!inputs || !Array.isArray(inputs)) {
      console.log('No inputs provided or inputs is not an array');
      return [{
        nodeType: 'UNKNOWN',
        nodeText: 'No flow data available',
        input: null,
        expectedResponse: null
      }];
    }
    
    if (!inputMetadata || !Array.isArray(inputMetadata)) {
      console.log('No inputMetadata provided, creating basic steps from inputs');
      return inputs.map((input, index) => ({
        nodeType: 'UNKNOWN',
        nodeText: `Step ${index + 1}`,
        input: input,
        expectedResponse: 'Unknown response'
      }));
    }
    
    return inputMetadata.map((meta, index) => {
      let actualInput = meta.input;
      let expectedResponse = meta.nodeText || '';
      
      // Replace * with actual values from combination for dynamic inputs
      if (meta.input === '*' && meta.storeAttribute && inputCombination[meta.storeAttribute]) {
        actualInput = inputCombination[meta.storeAttribute];
      }
      
      return {
        nodeType: meta.nodeType || 'UNKNOWN',
        nodeText: `Input: ${actualInput}`,
        input: actualInput,
        expectedResponse: expectedResponse,
        storeAttribute: meta.storeAttribute
      };
    });
  };

  // Create flow description from K6 data
  const createFlowDescription = (inputs, inputMetadata, inputCombination = {}) => {
    console.log('createFlowDescription called with:', { inputs, inputMetadata, inputCombination });
    
    if (!inputs || !Array.isArray(inputs)) {
      return 'No flow data available';
    }
    
    if (!inputMetadata || !Array.isArray(inputMetadata)) {
      return inputs.join(' → ');
    }
    
    return inputMetadata.map((meta, index) => {
      let displayValue = meta.input;
      
      if (meta.input === '*' && meta.storeAttribute && inputCombination[meta.storeAttribute]) {
        displayValue = `${meta.storeAttribute}(${inputCombination[meta.storeAttribute]})`;
      } else if (meta.input !== '*') {
        displayValue = meta.input;
      } else {
        displayValue = `${meta.storeAttribute || 'INPUT'}(*)`;
      }
      
      return displayValue;
    }).join(' → ');
  };

  // Get node text for display
  const getNodeText = (nodeType, storeAttribute, input, nodeText) => {
    // Use nodeText if available
    if (nodeText && nodeText !== `${nodeType} Node`) {
      return nodeText;
    }
    
    switch (nodeType) {
      case 'START':
        return 'Welcome to Service';
      case 'MENU':
        return `Menu: Select ${input}`;
      case 'INPUT':
        return `Enter ${storeAttribute || 'Value'}`;
      case 'ACTION':
        return `Process Action ${input}`;
      case 'END':
        return 'Transaction Complete';
      default:
        return `${nodeType}: ${input}`;
    }
  };

  // Get unique end nodes from test cases
  const getUniqueEndNodes = () => {
    const endNodes = new Set();
    testCases.forEach(testCase => {
      const lastStep = testCase.steps?.[testCase.steps.length - 1];
      if (lastStep && lastStep.expectedResponse) {
        endNodes.add(lastStep.expectedResponse);
      }
    });
    return Array.from(endNodes);
  };

  // Analyze K6 script coverage using new graph-based approach
  const analyzeK6Coverage = () => {
    if (!generatedScript || testCases.length === 0) {
      return <div className="coverage-item warning">⚠️ Cannot analyze coverage - missing data</div>;
    }

    try {
      // Create generator to get analysis
      const graphData = { nodes: nodes, edges: edges, timestamp: new Date().toISOString() };
      const generator = new K6GraphTestGenerator(graphData, config);
      const analysis = generator.getFlowAnalysis();
      
      // Extract scenarios from generated script
      const scenarioMatches = generatedScript.match(/const FLOW_SCENARIOS = \[([\s\S]*?)\];/);
      let k6ScenariosCount = 0;
      
      if (scenarioMatches) {
        try {
          const scenariosText = scenarioMatches[1];
          const scenarioBlocks = scenariosText.split(/\{\s*"name"/).length - 1;
          k6ScenariosCount = scenarioBlocks;
        } catch (error) {
          console.error('Error parsing K6 scenarios:', error);
          const nameMatches = generatedScript.match(/"name":\s*"Flow_[^"]+"/g);
          k6ScenariosCount = nameMatches ? nameMatches.length : 0;
        }
      }

      const coverage = {
        testCasesTotal: testCases.length,
        maxPossible: analysis.totalScenarios,
        k6ScenariosTotal: k6ScenariosCount,
        nodesCovered: analysis.totalNodes,
        edgesCovered: analysis.totalEdges,
        testCaseCoverage: analysis.totalScenarios > 0 ? Math.round((testCases.length / analysis.totalScenarios) * 100) : 0,
        k6Coverage: analysis.totalScenarios > 0 ? Math.round((k6ScenariosCount / analysis.totalScenarios) * 100) : 0,
        pathCoverage: Math.round((analysis.averagePathLength / analysis.totalNodes) * 100),
        dynamicMenuSupport: analysis.dynamicMenuNodes > 0,
        actionNodeSupport: analysis.actionNodes > 0
      };

      const testCasesWithDynamicInputs = testCases.filter(tc => 
        tc.steps && tc.steps.some(step => step.input === '*' || step.action.includes('dynamic'))
      );
      const dynamicInputCombinations = testCasesWithDynamicInputs.length;
      
      const hasDynamicInputs = generatedScript.includes('generateDynamicValue') && 
                              generatedScript.includes('storeAttribute');

      return (
        <div className="coverage-results">
          <div className="coverage-item">
            <span className={`coverage-status ${coverage.testCaseCoverage >= 95 ? 'good' : coverage.testCaseCoverage >= 80 ? 'warning' : 'error'}`}>
              {coverage.testCaseCoverage >= 95 ? '✅' : coverage.testCaseCoverage >= 80 ? '⚠️' : '❌'}
            </span>
            <div className="coverage-text">
              <strong>Test Case Discovery:</strong> {coverage.testCasesTotal} test cases from {coverage.maxPossible} possible scenarios ({coverage.testCaseCoverage}%)
            </div>
          </div>

          <div className="coverage-item">
            <span className={`coverage-status ${coverage.k6Coverage >= 95 ? 'good' : coverage.k6Coverage >= 80 ? 'warning' : 'error'}`}>
              {coverage.k6Coverage >= 95 ? '✅' : coverage.k6Coverage >= 80 ? '⚠️' : '❌'}
            </span>
            <div className="coverage-text">
              <strong>K6 Script Coverage:</strong> {coverage.k6ScenariosTotal} scenarios covering {coverage.k6Coverage}% of possible flows
            </div>
          </div>
          
          <div className="coverage-item">
            <span className={`coverage-status ${coverage.pathCoverage >= 80 ? 'good' : coverage.pathCoverage >= 60 ? 'warning' : 'error'}`}>
              {coverage.pathCoverage >= 80 ? '✅' : coverage.pathCoverage >= 60 ? '⚠️' : '❌'}
            </span>
            <div className="coverage-text">
              <strong>Path Coverage:</strong> {coverage.pathCoverage}% average path depth ({coverage.nodesCovered} nodes, {coverage.edgesCovered} edges)
            </div>
          </div>
          
          <div className="coverage-item">
            <span className={`coverage-status ${hasDynamicInputs ? 'good' : 'error'}`}>
              {hasDynamicInputs ? '✅' : '❌'}
            </span>
            <div className="coverage-text">
              <strong>Dynamic Input Support:</strong> {hasDynamicInputs ? 'Enabled' : 'Missing'} 
              {dynamicInputCombinations > 0 && ` (${dynamicInputCombinations} dynamic test cases)`}
            </div>
          </div>
          
          <div className="coverage-item">
            <span className={`coverage-status ${coverage.dynamicMenuSupport ? 'good' : 'warning'}`}>
              {coverage.dynamicMenuSupport ? '✅' : '⚠️'}
            </span>
            <div className="coverage-text">
              <strong>Dynamic Menu Support:</strong> {coverage.dynamicMenuSupport ? `Detected (${analysis.dynamicMenuNodes} nodes)` : 'No dynamic menus found'}
            </div>
          </div>
          
          <div className="coverage-item">
            <span className={`coverage-status ${coverage.actionNodeSupport ? 'good' : 'warning'}`}>
              {coverage.actionNodeSupport ? '✅' : '⚠️'}
            </span>
            <div className="coverage-text">
              <strong>Action Node Support:</strong> {coverage.actionNodeSupport ? `Detected (${analysis.actionNodes} nodes)` : 'No action nodes found'}
            </div>
          </div>

          {(coverage.testCaseCoverage < 95 || coverage.k6Coverage < 95) && (
            <div className="coverage-recommendation">
              <h5>💡 Recommendations:</h5>
              <ul>
                {coverage.testCaseCoverage < 95 && (
                  <li>Test case generation found {coverage.testCasesTotal}/{coverage.maxPossible} possible scenarios - some paths may be unreachable</li>
                )}
                {coverage.k6Coverage < 80 && (
                  <li>K6 script covers only {coverage.k6ScenariosTotal} scenarios - consider adding more flow paths</li>
                )}
                {!hasDynamicInputs && (
                  <li>Enable dynamic input generation to test all storeAttribute combinations</li>
                )}
                {!coverage.dynamicMenuSupport && (
                  <li>Consider adding dynamic menus to test API-driven menu content</li>
                )}
                {coverage.pathCoverage < 80 && (
                  <li>Average path coverage is {coverage.pathCoverage}% - consider longer, more complex flows</li>
                )}
              </ul>
            </div>
          )}

          {coverage.testCaseCoverage >= 95 && coverage.k6Coverage >= 95 && (
            <div className="coverage-success">
              <h5>🎉 Excellent Coverage!</h5>
              <p>Your graph-based test setup covers {coverage.testCaseCoverage}% of possible flows with comprehensive K6 scenarios. 
              Flow includes {analysis.nodeTypes.join(', ')} node types for thorough testing.</p>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      return <div className="coverage-item error">❌ Error analyzing coverage: {error.message}</div>;
    }
  };

  // Generate input combinations based on K6 flow data structure
  const generateInputCombinationsFromK6Data = (pathInputsWithStoreAttributes) => {
    const combinations = [];
    const attributeValues = {};

    // Prepare value arrays for each storeAttribute found in the path
    pathInputsWithStoreAttributes.forEach(input => {
      const attr = input.storeAttribute;
      if (!attr) return;

      const attrConfig = config.dynamicInputs.attributeConfigs?.[attr];
      if (attrConfig) {
        if (attrConfig.type === 'amount' && attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        } else if (attrConfig.type === 'pin' && attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        } else if (attrConfig.type === 'phone' && attrConfig.prefixes) {
          // Generate sample phone numbers using the exact same logic as K6 script
          const phoneNumbers = attrConfig.prefixes.slice(0, 3).map(prefix => {
            const remainingLength = (attrConfig.length || 10) - prefix.length;
            let suffix = '';
            for (let i = 0; i < remainingLength; i++) {
              suffix += Math.floor(Math.random() * 10);
            }
            return prefix + suffix;
          });
          attributeValues[attr] = phoneNumbers;
        } else if (attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        }
      } else {
        // Default values if no config
        attributeValues[attr] = ['*', 'DEFAULT_VALUE'];
      }
    });

    // Generate combinations (limit to prevent UI overload)
    const attrs = Object.keys(attributeValues);
    if (attrs.length === 0) return [{}];

    const maxCombinations = 12;
    let combinationCount = 0;

    const generateCombinationsRecursive = (attrIndex, currentCombination) => {
      if (combinationCount >= maxCombinations) return;
      
      if (attrIndex >= attrs.length) {
        combinations.push({ ...currentCombination });
        combinationCount++;
        return;
      }

      const attr = attrs[attrIndex];
      const values = attributeValues[attr].slice(0, 3); // Take first 3 values max

      values.forEach(value => {
        if (combinationCount >= maxCombinations) return;
        
        currentCombination[attr] = value;
        generateCombinationsRecursive(attrIndex + 1, currentCombination);
      });
    };

    generateCombinationsRecursive(0, {});
    return combinations;
  };

  // Generate input combinations specifically for K6 script generation (all combinations)
  const generateInputCombinationsForK6 = (dynamicInputs) => {
    const combinations = [];
    const attributeValues = {};

    // Prepare value arrays for each storeAttribute
    dynamicInputs.forEach(input => {
      const attr = input.storeAttribute;
      if (!attr) return;

      const attrConfig = config.dynamicInputs.attributeConfigs?.[attr];
      if (attrConfig) {
        if (attrConfig.type === 'amount' && attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        } else if (attrConfig.type === 'pin' && attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        } else if (attrConfig.type === 'phone' && attrConfig.prefixes) {
          // Generate phone numbers using all prefixes
          const phoneNumbers = attrConfig.prefixes.map(prefix => {
            const remainingLength = (attrConfig.length || 10) - prefix.length;
            let suffix = '';
            for (let i = 0; i < remainingLength; i++) {
              suffix += Math.floor(Math.random() * 10);
            }
            return prefix + suffix;
          });
          attributeValues[attr] = phoneNumbers;
        } else if (attrConfig.values) {
          attributeValues[attr] = attrConfig.values;
        }
      } else {
        // Default values if no config
        attributeValues[attr] = ['DEFAULT_VALUE'];
      }
    });

    // Generate ALL combinations (no limit for K6 script)
    const attrs = Object.keys(attributeValues);
    if (attrs.length === 0) return [{}];

    const generateAllCombinations = (attrIndex, currentCombination) => {
      if (attrIndex >= attrs.length) {
        combinations.push({ ...currentCombination });
        return;
      }

      const attr = attrs[attrIndex];
      const values = attributeValues[attr];

      values.forEach(value => {
        currentCombination[attr] = value;
        generateAllCombinations(attrIndex + 1, currentCombination);
      });
    };

    generateAllCombinations(0, {});
    return combinations;
  };

  const generateK6Script = () => {
    setIsGenerating(true);
    
    try {
      console.log('🚀 Generating K6 script using new Canvas Graph structure...');
      
      // Use the new graph-based generation logic inline with dynamic menus
      const k6Script = generateK6ScriptFromGraph(nodes, edges, config, dynamicMenus);
      
      setGeneratedScript(k6Script);
      
      // Also generate test cases for visualization  
      generateAllTestCases();
      
      console.log('✅ K6 script generated successfully with new graph-based approach!');
      
    } catch (error) {
      console.error('❌ Error generating K6 script:', error);
      alert(`Error generating K6 script: ${error.message}\n\nPlease ensure your flow has:\n- At least one START node\n- At least one END node\n- Connected paths between nodes`);
    } finally {
      setIsGenerating(false);
    }
  };

  // New graph-based K6 script generation
  const generateK6ScriptFromGraph = (nodes, edges, config, dynamicMenusConfig = {}) => {
    console.log('📊 Analyzing canvas graph structure...');
    console.log('🎛️ Dynamic Menu Config received:', dynamicMenusConfig);
    
    // Store dynamic menus for assertion creation
    const dynamicMenusForAssertions = dynamicMenusConfig;
    // Find START and END nodes
    const startNodes = nodes.filter(node => 
      node.type === 'start' || (node.data && node.data.type === 'START')
    );
    
    const endNodes = nodes.filter(node => 
      node.type === 'end' || (node.data && node.data.type === 'END')
    );
    
    if (startNodes.length === 0) {
      throw new Error('No START nodes found. Please add at least one START node to your flow.');
    }
    
    if (endNodes.length === 0) {
      throw new Error('No END nodes found. Please add at least one END node to your flow.');
    }
    
    console.log(`📍 Found ${startNodes.length} START nodes and ${endNodes.length} END nodes`);
    
    // Generate scenarios from all possible paths
    const scenarios = [];
    
    startNodes.forEach(startNode => {
      const paths = findPathsFromStart(startNode, nodes, edges);
      console.log(`🛤️ Found ${paths.length} paths from START node ${startNode.id}`);
      
      paths.forEach((path, pathIndex) => {
        const scenario = createScenarioFromPath(startNode, path, pathIndex, dynamicMenusForAssertions, edges);
        scenarios.push(scenario);
      });
    });
    
    console.log(`✅ Generated ${scenarios.length} total test scenarios`);
    
    // Generate the K6 script
    return createK6ScriptFromScenarios(scenarios, config);
  };

  // Find all paths from a START node to END nodes
  const findPathsFromStart = (startNode, allNodes, allEdges) => {
    const paths = [];
    const maxDepth = 20;
    
    const traverse = (currentNode, currentPath, visited = new Set(), edgeInfo = null) => {
      if (visited.has(currentNode.id) || currentPath.length > maxDepth) {
        return;
      }
      
      // Enhanced path node with edge information
      const pathNode = {
        ...currentNode,
        edgeInfo: edgeInfo // Include edge information for conditional paths
      };
      
      const newPath = [...currentPath, pathNode];
      const newVisited = new Set(visited);
      newVisited.add(currentNode.id);
      
      // Check if this is an END node
      const nodeType = getNodeType(currentNode);
      if (nodeType === 'END') {
        paths.push(newPath);
        return;
      }
      
      // Find outgoing edges
      const outgoingEdges = allEdges.filter(edge => edge.source === currentNode.id);
      
      if (outgoingEdges.length === 0) {
        // Dead end - still add as path
        paths.push(newPath);
        return;
      }
      
      // Follow each edge with sourceHandle information
      outgoingEdges.forEach(edge => {
        const nextNode = allNodes.find(n => n.id === edge.target);
        if (nextNode) {
          const edgeData = {
            sourceHandle: edge.sourceHandle,
            label: edge.label,
            id: edge.id
          };
          traverse(nextNode, newPath, newVisited, edgeData);
        }
      });
    };
    
    traverse(startNode, []);
    return paths;
  };

  // Create scenario from a path
  const createScenarioFromPath = (startNode, path, pathIndex, dynamicMenusRef = {}, allEdges = []) => {
    const scenario = {
      name: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
      startInput: getStartInput(startNode),
      steps: [],
      assertions: []
    };
    
    // Enhanced assertion function that considers path context
    const createAssertionFromNodeWithMenus = (node, dynamicMenusConfig = {}, edgeInfo = null) => {
      const nodeType = getNodeType(node);
      
      // ACTION nodes are internal API calls - no user-facing assertions needed
      if (nodeType === 'ACTION') {
        return null;
      }
      
      let expectedResponse = '';
      
      // For DYNAMIC-MENU nodes, check custom config first
      if (nodeType === 'DYNAMIC-MENU') {
        console.log(`🔍 DYNAMIC-MENU assertion for node ${node.id}:`);
        console.log('  Available config:', dynamicMenusConfig[node.id]);
        // Use user-provided dynamic menu content if available
        if (dynamicMenusConfig[node.id] && dynamicMenusConfig[node.id].menuContent && dynamicMenusConfig[node.id].menuContent.trim()) {
          expectedResponse = dynamicMenusConfig[node.id].menuContent;
          console.log(`  ✅ Using custom content: "${expectedResponse}"`);
        } else if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
          expectedResponse = node.data.config.prompts.en;
          console.log(`  ℹ️ Using node prompt: "${expectedResponse}"`);
        } else {
          expectedResponse = 'Please select an option:';
          console.log(`  ⚠️ Using default content: "${expectedResponse}"`);
        }
      } else if (nodeType === 'END' && edgeInfo && edgeInfo.sourceHandle) {
        // Enhanced END node handling based on the edge that led to this node
        console.log(`🔍 END node assertion for ${node.id} via edge: ${edgeInfo.sourceHandle}`);
        
        // Look up the correct response based on the specific condition path
        const edgeHandle = edgeInfo.sourceHandle;
        
        // Map common conditional paths to their responses
        if (edgeHandle.includes('condition1')) {
          // Success condition - use node's prompt or success message
          if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
            expectedResponse = node.data.config.prompts.en;
            console.log(`  ✅ Using condition1 success message: "${expectedResponse}"`);
          } else {
            expectedResponse = 'Thank you for using our service! Transaction successful';
            console.log(`  ✅ Using default success message: "${expectedResponse}"`);
          }
        } else if (edgeHandle.includes('NoMatch')) {
          // Error/failure condition
          if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
            expectedResponse = node.data.config.prompts.en;
            console.log(`  ⚠️ Using NoMatch error message: "${expectedResponse}"`);
          } else {
            expectedResponse = 'Thank you for using our service! Service Not available';
            console.log(`  ⚠️ Using default error message: "${expectedResponse}"`);
          }
        } else {
          // General response path
          if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
            expectedResponse = node.data.config.prompts.en;
          } else {
            expectedResponse = 'Thank you for using our service!';
          }
        }
      } else if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
        expectedResponse = node.data.config.prompts.en;
      } else {
        // Fallback based on node type
        switch (nodeType) {
          case 'INPUT':
            expectedResponse = 'Please enter your input:';
            break;
          case 'MENU':
            expectedResponse = 'Please select an option:';
            break;
          case 'END':
            expectedResponse = 'Thank you for using our service!';
            break;
          default:
            expectedResponse = 'Please proceed';
        }
      }
      
      return {
        expectedResponse: expectedResponse,
        nodeType: nodeType,
        assertionType: nodeType.toLowerCase()
      };
    };
    
    // Create steps from path (exclude START step since it's handled separately)
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i];
      const nextNode = path[i + 1];
      
      // Skip creating step for START node since it's handled in startInput
      if (getNodeType(currentNode) === 'START') {
        // Only create assertion for the next node after START
        const assertion = createAssertionFromNodeWithMenus(nextNode, dynamicMenusRef, nextNode.edgeInfo);
        if (assertion !== null) {
          scenario.assertions.push(assertion);
        }
        continue;
      }
      
      const step = createStepFromNodes(currentNode, nextNode, i, allEdges);
      scenario.steps.push(step);
      
      // Create assertion for the next node (skip ACTION nodes) with edge context
      const assertion = createAssertionFromNodeWithMenus(nextNode, dynamicMenusRef, nextNode.edgeInfo);
      if (assertion !== null) {
        scenario.assertions.push(assertion);
      }
    }
    
    return scenario;
  };

  // Create step from two connected nodes
  const createStepFromNodes = (currentNode, nextNode, stepIndex, edges) => {
    const nodeType = getNodeType(currentNode);
    const nextNodeType = getNodeType(nextNode);
    
    let userInput = '';
    let storeAttribute = null;
    
    switch (nodeType) {
      case 'START':
        userInput = getStartInput(currentNode);
        break;
      case 'MENU':
        // Determine menu selection based on the target node from edges
        const menuEdge = edges.find(e => e.source === currentNode.id && e.target === nextNode.id);
        if (menuEdge && menuEdge.sourceHandle && menuEdge.sourceHandle.startsWith('option-')) {
          userInput = menuEdge.sourceHandle.replace('option-', ''); // Extract option number
        } else {
          // Fallback: look at transitions to determine correct option
          const transitions = currentNode.data?.config?.transitions || {};
          const targetOption = Object.keys(transitions).find(key => 
            transitions[key] === nextNode.id || transitions[key] === ''
          );
          userInput = targetOption || '1'; // Default to option 1 if not found
        }
        console.log(`🔧 MENU selection for ${currentNode.id} → ${nextNode.id}: option "${userInput}"`);
        break;
      case 'INPUT':
        userInput = '*'; // Dynamic input
        storeAttribute = currentNode.data?.config?.variableName || 
                        currentNode.data?.config?.storeAttribute || null;
        break;
      case 'DYNAMIC-MENU':
        userInput = '*'; // Dynamic selection
        break;
      case 'ACTION':
        userInput = ''; // No user input for actions
        break;
      default:
        userInput = '';
    }
    
    return {
      input: userInput,
      storeAttribute: storeAttribute,
      nodeType: nodeType,
      nextNodeType: nextNodeType,
      isActionNode: nextNodeType === 'ACTION'
    };
  };

  // Create assertion from node (skip ACTION nodes as they are internal)
  const createAssertionFromNode = (node) => {
    const nodeType = getNodeType(node);
    
    // ACTION nodes are internal API calls - no user-facing assertions needed
    if (nodeType === 'ACTION') {
      return null;
    }
    
    let expectedResponse = '';
    
    if (node.data && node.data.config && node.data.config.prompts && node.data.config.prompts.en) {
      expectedResponse = node.data.config.prompts.en;
    } else {
      // Fallback based on node type
      switch (nodeType) {
        case 'INPUT':
          expectedResponse = 'Please enter your input:';
          break;
        case 'MENU':
          expectedResponse = 'Please select an option:';
          break;
        case 'DYNAMIC-MENU':
          // Use user-provided dynamic menu content if available
          if (dynamicMenus[node.id] && dynamicMenus[node.id].menuContent.trim()) {
            expectedResponse = dynamicMenus[node.id].menuContent;
          } else {
            expectedResponse = 'Please select an option:';
          }
          break;
        case 'END':
          expectedResponse = 'Thank you for using our service!';
          break;
        default:
          expectedResponse = 'Please proceed';
      }
    }
    
    return {
      expectedResponse: expectedResponse,
      nodeType: nodeType,
      assertionType: nodeType.toLowerCase()
    };
  };

  // Create the actual K6 script from scenarios
  const createK6ScriptFromScenarios = (scenarios, config) => {
    let testConfiguration;
    
    if (config.testMode === 'tps') {
      // TPS-based configuration
      const { targetTPS, duration, avgTransactionTime, thinkTime, maxVUs } = config.tpsConfig;
      
      // Calculate required VUs for target TPS
      const transactionTimeSeconds = avgTransactionTime;
      const thinkTimeSeconds = thinkTime;
      const totalCycleTime = transactionTimeSeconds + thinkTimeSeconds;
      const calculatedVUs = Math.ceil(targetTPS * totalCycleTime);
      const finalVUs = Math.min(calculatedVUs, maxVUs);
      
      // TPS-focused stages
      const tpsStages = [
        { duration: '30s', target: Math.ceil(finalVUs * 0.1) }, // Warm-up to 10%
        { duration: '1m', target: Math.ceil(finalVUs * 0.5) },  // Ramp to 50%
        { duration: '30s', target: finalVUs },                   // Reach target VUs
        { duration: duration, target: finalVUs },                // Maintain target
        { duration: '30s', target: 0 }                          // Cool down
      ];
      
      testConfiguration = {
        stages: tpsStages,
        tpsMode: true,
        targetTPS: targetTPS,
        avgTransactionTime: transactionTimeSeconds,
        thinkTime: thinkTimeSeconds,
        calculatedVUs: finalVUs,
        thresholds: {
          http_req_duration: ['p(95)<3000'],
          http_req_failed: ['rate<0.1'],
          errors: ['rate<0.05'],
          flow_completion: ['rate>0.9'],
          step_failures: ['rate<0.05'],
          dynamic_input_success: ['rate>0.95'],
          // TPS-specific thresholds
          http_reqs: [`rate>=${targetTPS * 0.95}`], // At least 95% of target TPS
          'http_req_duration{type:transaction}': ['avg<' + (transactionTimeSeconds * 1000)]
        }
      };
    } else {
      // VU-based configuration (original)
      const loadStages = {
        light: [
          { duration: '30s', target: 5 },
          { duration: '1m', target: 5 },
          { duration: '30s', target: 0 }
        ],
        moderate: [
          { duration: '1m', target: 20 },
          { duration: '3m', target: 20 },
          { duration: '1m', target: 50 },
          { duration: '2m', target: 50 },
          { duration: '1m', target: 0 }
        ],
        heavy: [
          { duration: '2m', target: 50 },
          { duration: '5m', target: 100 },
          { duration: '2m', target: 200 },
          { duration: '3m', target: 200 },
          { duration: '2m', target: 0 }
        ]
      };
      
      testConfiguration = {
        stages: loadStages[config.loadProfile] || loadStages.moderate,
        tpsMode: false,
        thresholds: {
          http_req_duration: ['p(95)<3000'],
          http_req_failed: ['rate<0.1'],
          errors: ['rate<0.05'],
          flow_completion: ['rate>0.9'],
          step_failures: ['rate<0.05'],
          dynamic_input_success: ['rate>0.95']
        }
      };
    }

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for Canvas Graph USSD testing
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const dynamicInputSuccess = new Rate('dynamic_input_success');
${testConfiguration.tpsMode ? `
// TPS-specific metrics
const tpsMetric = new Rate('tps_achieved');
const transactionTiming = new Trend('transaction_duration');` : ''}

// Test configuration
export const options = {
  stages: ${JSON.stringify(testConfiguration.stages, null, 4)},
  
  thresholds: ${JSON.stringify(testConfiguration.thresholds, null, 4)},

  tags: {
    testType: 'ussd_canvas_graph_test',
    generator: 'k6-canvas-generator',
    mode: '${testConfiguration.tpsMode ? 'tps' : 'vu'}',
    ${testConfiguration.tpsMode ? `targetTPS: ${testConfiguration.targetTPS},
    calculatedVUs: ${testConfiguration.calculatedVUs},` : ''}
    version: '${new Date().toISOString().split('T')[0]}'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: '${config.baseUrl}',
  ENDPOINT: '${config.endpoint}',
  LOGIN: '${config.login}',
  PASSWORD: '${config.password}',
  PHONE_PREFIX: '${config.phonePrefix}',
  SESSION_ID_PREFIX: '${config.sessionIdPrefix}',
  
  // Timing configuration based on test mode
  ${testConfiguration.tpsMode ? `TPS_MODE: true,
  TARGET_TPS: ${testConfiguration.targetTPS},
  AVG_TRANSACTION_TIME: ${testConfiguration.avgTransactionTime},
  THINK_TIME: ${testConfiguration.thinkTime},
  CALCULATED_VUS: ${testConfiguration.calculatedVUs}` : `TPS_MODE: false,
  VU_THINK_TIME_MIN: 1,
  VU_THINK_TIME_MAX: 2,
  VU_STEP_DELAY_MIN: 0.5,
  VU_STEP_DELAY_MAX: 1.5,
  VU_SESSION_DELAY_MIN: 2,
  VU_SESSION_DELAY_MAX: 3`}
};

// Flow scenarios from Canvas Graph
const FLOW_SCENARIOS = ${JSON.stringify(scenarios, null, 2)};

// Timing helper functions
function getThinkTime() {
  if (CONFIG.TPS_MODE) {
    return CONFIG.THINK_TIME;
  } else {
    return CONFIG.VU_THINK_TIME_MIN + Math.random() * (CONFIG.VU_THINK_TIME_MAX - CONFIG.VU_THINK_TIME_MIN);
  }
}

function getStepDelay() {
  if (CONFIG.TPS_MODE) {
    return CONFIG.THINK_TIME * 0.25; // Quarter of think time for TPS step delays
  } else {
    return CONFIG.VU_STEP_DELAY_MIN + Math.random() * (CONFIG.VU_STEP_DELAY_MAX - CONFIG.VU_STEP_DELAY_MIN);
  }
}

function getSessionDelay() {
  if (CONFIG.TPS_MODE) {
    return CONFIG.THINK_TIME;
  } else {
    return CONFIG.VU_SESSION_DELAY_MIN + Math.random() * (CONFIG.VU_SESSION_DELAY_MAX - CONFIG.VU_SESSION_DELAY_MIN);
  }
}

// Utility functions
function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

// Generate dynamic values based on storeAttribute
function generateDynamicValue(storeAttribute) {
  if (!storeAttribute) return 'DEFAULT_VALUE';
  
  const attr = storeAttribute.toUpperCase();
  
  switch (true) {
    case attr.includes('PIN') || attr.includes('PASSWORD'):
      return ['1234', '5678', '1111', '0000', '9999'][Math.floor(Math.random() * 5)];
    
    case attr.includes('AMOUNT') || attr.includes('MONEY'):
      return [10, 25, 50, 100, 200, 500, 1000, 2000, 5000][Math.floor(Math.random() * 9)].toString();
    
    case attr.includes('PHONE') || attr.includes('MSISDN'):
      const prefixes = ['777', '778', '779', '770'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      return prefix + suffix;
    
    case attr.includes('ACCOUNT'):
      return Math.floor(100000000 + Math.random() * 900000000).toString();
    
    default:
      return 'DEFAULT_VALUE';
  }
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
  
  const fullUrl = \`\${url}?\${queryString}\`;
  
  const startTime = Date.now();
  const response = http.get(fullUrl);
  const duration = Date.now() - startTime;
  
  console.log(\`[\${new Date().toISOString()}] \${input} -> \${response.status} (\${duration}ms)\`);
  
  return { response, duration };
}

function validateResponse(response, assertion, stepIndex, scenarioName) {
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    assertion_type: assertion.assertionType
  };
  
  // Enhanced logging - show what we're comparing
  console.log(\`🔍 Step \${stepIndex} Validation (\${assertion.nodeType}):\`);
  console.log(\`📥 ACTUAL RESPONSE: "\${response.body ? response.body.trim() : 'NO BODY'}"\`);
  console.log(\`📋 EXPECTED: "\${assertion.expectedResponse}"\`);
  console.log(\`📊 Status: \${response.status}, Duration: \${response.timings.duration}ms\`);
  
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  if (response.body && assertion.expectedResponse) {
    // Enhanced content validation for Canvas Graph flows
    checks['content validation'] = (r) => {
      const bodyLower = r.body.toLowerCase();
      const expectedLower = assertion.expectedResponse.toLowerCase();
      
      console.log(\`🔍 Content Matching Check:\`);
      console.log(\`  Body (lowercase): "\${bodyLower}"\`);
      console.log(\`  Expected (lowercase): "\${expectedLower}"\`);
      
      // For menu nodes, check for menu structure
      if (assertion.nodeType === 'MENU') {
        const hasMenuNumbers = /\\d+\\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(\`  Menu numbers found: \${hasMenuNumbers}\`);
        console.log(\`  Contains expected text: \${containsExpected}\`);
        console.log(\`  MENU validation result: \${result ? 'PASSED' : 'FAILED'}\`);
        
        return result;
      }
      
      // For input nodes, check for input prompts
      if (assertion.nodeType === 'INPUT') {
        const inputKeywords = ['enter', 'input', 'provide'];
        const hasInputKeyword = inputKeywords.some(keyword => bodyLower.includes(keyword));
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasInputKeyword || containsExpected;
        
        console.log(\`  Input keywords found: \${hasInputKeyword}\`);
        console.log(\`  Contains expected text: \${containsExpected}\`);
        console.log(\`  INPUT validation result: \${result ? 'PASSED' : 'FAILED'}\`);
        
        return result;
      }
      
      // For end nodes, enhanced validation with dynamic content handling
      if (assertion.nodeType === 'END') {
        console.log(\`🔍 END Node Dynamic Content Validation:\`);
        console.log(\`  Expected template: "\${assertion.expectedResponse}"\`);
        console.log(\`  Actual response: "\${r.body}"\`);
        
        // Handle dynamic content in END nodes (like transaction IDs)
        const actualBody = r.body.toLowerCase();
        const expectedText = assertion.expectedResponse.toLowerCase();
        
        // Extract static parts by removing dynamic placeholders
        const staticParts = expectedText
          .split(/:[a-zA-Z_][a-zA-Z0-9_]*/)  // Split on :variableName patterns
          .filter(part => part.trim().length > 3)  // Only keep meaningful parts (not just "with", etc.)
          .map(part => part.trim());
        
        console.log(\`  Static parts to find: [\${staticParts.join(', ')}]\`);
        
        // Check if key static parts are present in the response
        const keyPartsFound = staticParts.filter(part => 
          actualBody.includes(part)
        );
        
        console.log(\`  Parts found: [\${keyPartsFound.join(', ')}]\`);
        
        // Success if most key parts are found (flexible matching)
        const matchPercentage = staticParts.length > 0 ? (keyPartsFound.length / staticParts.length) : 0;
        
        if (matchPercentage >= 0.7 && keyPartsFound.length > 0) { // 70% match threshold
          console.log(\`✅ END node validation: Found \${keyPartsFound.length}/\${staticParts.length} key parts (\${Math.round(matchPercentage * 100)}%) - PASSED\`);
          return true;
        }
        
        // Fallback: check for completion keywords
        const completionKeywords = ['thank', 'success', 'complete', 'transaction'];
        const foundCompletionKeywords = completionKeywords.filter(keyword => actualBody.includes(keyword));
        const hasCompletionKeyword = foundCompletionKeywords.length > 0;
        
        if (hasCompletionKeyword) {
          console.log(\`✅ END node validation: Found completion indicators [\${foundCompletionKeywords.join(', ')}] - PASSED\`);
          return true;
        }
        
        console.log(\`❌ END node validation: Only found \${keyPartsFound.length}/\${staticParts.length} key parts (\${Math.round(matchPercentage * 100)}%) - FAILED\`);
        return false;
      }
      
      // For dynamic menu responses
      if (assertion.nodeType === 'DYNAMIC-MENU') {
        const hasMenuNumbers = /\\d+\\./.test(r.body);
        const containsExpected = bodyLower.includes(expectedLower);
        const result = hasMenuNumbers || containsExpected;
        
        console.log(\`  Dynamic menu numbers found: \${hasMenuNumbers}\`);
        console.log(\`  Contains expected text: \${containsExpected}\`);
        console.log(\`  DYNAMIC-MENU validation result: \${result ? 'PASSED' : 'FAILED'}\`);
        
        return result;
      }
      
      // General content matching
      const result = bodyLower.includes(expectedLower);
      console.log(\`  General content match: \${result ? 'PASSED' : 'FAILED'}\`);
      return result;
    };
    
    // Check for error indicators
    const errorKeywords = ['error', 'invalid', 'failed', 'wrong', 'denied'];
    checks['no error indicators'] = (r) => {
      const foundErrors = errorKeywords.filter(keyword => r.body.toLowerCase().includes(keyword));
      const hasErrors = foundErrors.length > 0;
      
      if (hasErrors) {
        console.log(\`❌ Error indicators found: [\${foundErrors.join(', ')}]\`);
      } else {
        console.log(\`✅ No error indicators found\`);
      }
      
      return !hasErrors;
    };
  }
  
  const result = check(response, checks, tags);
  
  // Final validation summary
  console.log(\`📊 Validation Summary for Step \${stepIndex}:\`);
  console.log(\`  Overall Result: \${result ? '✅ PASSED' : '❌ FAILED'}\`);
  console.log(\`  Node Type: \${assertion.nodeType}\`);
  console.log(\`  Assertion Type: \${assertion.assertionType}\`);
  console.log(\`─────────────────────────────────────\`);
  
  return result;
}

export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Select random scenario
  const scenario = FLOW_SCENARIOS[Math.floor(Math.random() * FLOW_SCENARIOS.length)];
  
  console.log(\`🚀 Starting Canvas Graph scenario: \${scenario.name} for \${phoneNumber}\`);
  
  const sessionStart = Date.now();
  const transactionStart = Date.now();
  let flowCompleted = false;
  
  const sessionTags = {
    scenario_name: scenario.name,
    phone_number: phoneNumber.substring(0, 3) + 'XXX',
    test_mode: CONFIG.TPS_MODE ? 'tps' : 'vu'
  };
  
  try {
    // Step 1: Initiate USSD session
    const { response: startResponse } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      scenario.startInput, 
      1
    );
    
    // Validate start response
    if (scenario.assertions.length > 0) {
      const startAssertion = scenario.assertions[0];
      if (!validateResponse(startResponse, startAssertion, 0, scenario.name)) {
        errorRate.add(1, sessionTags);
        stepFailureRate.add(1, { ...sessionTags, step: 0 });
        return;
      }
    }
    
    sleep(getThinkTime());
    
    // Step 2: Process each step in the scenario (excluding START step)
    let assertionIndex = 1; // ✅ Start at 1 since assertion[0] was used for start response

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];

      let processedInput = step.input;

      // Handle dynamic inputs
      if (step.input === '*' && step.storeAttribute) {
        processedInput = generateDynamicValue(step.storeAttribute);
        console.log(\`🔄 Dynamic input: \${step.storeAttribute} -> \${processedInput}\`);
        dynamicInputSuccess.add(1, { ...sessionTags, attribute: step.storeAttribute });
      }

      // Skip ACTION nodes in user flow (they process automatically)
      if (step.nodeType === 'ACTION') {
        console.log(\`⚙️ Processing ACTION node automatically\`);
        continue; // ✅ Skip ACTION nodes but don't advance assertionIndex
      }

      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);

      // Validate response if assertion exists for this step's target node
      if (assertionIndex < scenario.assertions.length) {
        const assertion = scenario.assertions[assertionIndex];
        console.log(\`🔍 Using assertion[\${assertionIndex}] for step \${i + 1}: \${assertion.nodeType} - "\${assertion.expectedResponse}"\`);
        if (assertion && !validateResponse(response, assertion, i + 1, scenario.name)) {
          errorRate.add(1, { ...sessionTags, step: i + 1 });
          stepFailureRate.add(1, { ...sessionTags, step: i + 1 });
          console.log(\`❌ Step \${i + 1} failed validation\`);
          break;
        }
        assertionIndex++; // ✅ Only advance after processing a non-ACTION step
      }      // Check if this is the last step
      if (i === scenario.steps.length - 1) {
        flowCompleted = true;
        console.log(\`✅ Canvas Graph flow completed successfully for \${phoneNumber}\`);
      }
      
      sleep(getStepDelay());
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
    // TPS-specific metrics
    if (CONFIG.TPS_MODE) {
      const transactionDuration = Date.now() - transactionStart;
      transactionTiming.add(transactionDuration, sessionTags);
      tpsMetric.add(1, sessionTags);
      
      // Log TPS performance
      console.log(\`📊 TPS Transaction completed in \${transactionDuration}ms (target: \${CONFIG.AVG_TRANSACTION_TIME * 1000}ms)\`);
    }
    
  } catch (error) {
    console.error(\`Error in Canvas Graph scenario \${scenario.name}:\`, error.message);
    errorRate.add(1, sessionTags);
    flowCompletionRate.add(0, sessionTags);
  }
  
  sleep(getSessionDelay());
}

export function setup() {
  console.log('🚀 Canvas Graph USSD Load Test Started');
  console.log(\`Target: \${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`);
  console.log(\`Scenarios: \${FLOW_SCENARIOS.length}\`);
  console.log(\`Graph-based flow testing with dynamic inputs\`);
  
  if (CONFIG.TPS_MODE) {
    console.log(\`🎯 TPS Mode: Target \${CONFIG.TARGET_TPS} TPS with \${CONFIG.CALCULATED_VUS} VUs\`);
    console.log(\`⏱️ Transaction Time: \${CONFIG.AVG_TRANSACTION_TIME}s, Think Time: \${CONFIG.THINK_TIME}s\`);
  } else {
    console.log(\`👥 VU Mode: Traditional virtual user simulation\`);
  }
  
  return {
    timestamp: new Date().toISOString(),
    scenarios: FLOW_SCENARIOS.length,
    testMode: CONFIG.TPS_MODE ? 'tps' : 'vu',
    targetTPS: CONFIG.TPS_MODE ? CONFIG.TARGET_TPS : 'N/A'
  };
}

export function teardown(data) {
  console.log('📊 Canvas Graph Load Test Completed');
  console.log(\`Started at: \${data.timestamp}\`);
  console.log(\`Scenarios tested: \${data.scenarios}\`);
  console.log(\`Test Mode: \${data.testMode}\`);
  if (data.testMode === 'tps') {
    console.log(\`Target TPS: \${data.targetTPS}\`);
  }
}`;
  };

  const createK6Script = (flowData, config) => {
    try {
      console.log('Flow data received:', flowData);
      
      // Validate flow data
      if (!flowData || !flowData.nodes || !Array.isArray(flowData.nodes)) {
        throw new Error('Invalid flow data: nodes array is missing or invalid');
      }
      
      // Find START nodes and create scenarios
      const startNodes = flowData.nodes.filter(node => 
        node.type && node.type.toLowerCase() === 'start'
      );
      console.log('Found START nodes:', startNodes.length);
      console.log('All node types:', flowData.nodes.map(n => n.type));
      
      if (startNodes.length === 0) {
        throw new Error('No START nodes found in the flow. Please add at least one START node.');
      }
      
      const scenarios = [];
      
      startNodes.forEach((startNode, startIndex) => {
        try {
          console.log(`Processing START node ${startIndex + 1}:`, startNode.id);
          
          const paths = findFlowPaths(startNode, flowData.nodes);
          console.log(`Found ${paths.length} paths for START node ${startNode.id}`);
          
          paths.forEach((path, pathIndex) => {
            const inputsWithMetadata = extractInputsFromPath(path);
            const inputs = inputsWithMetadata.map(item => item.input);
            // Use the START node's first transition as the dial code (e.g., "123")
            const startInput = Object.keys(startNode.transitions || {})[0] || config.dialCode || 'default';
            
            // Find dynamic inputs that need combinations
            const dynamicInputs = inputsWithMetadata.filter(meta => 
              meta.storeAttribute && meta.input === '*'
            );
            
            if (dynamicInputs.length === 0) {
              // No dynamic inputs - create single scenario
              scenarios.push({
                name: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
                startInput: startInput,
                inputs: inputs,
                inputMetadata: inputsWithMetadata,
                startNode: startNode // Include START node for expected response extraction
              });
            } else {
              // Generate all combinations for this path
              const inputCombinations = generateInputCombinationsForK6(dynamicInputs);
              
              inputCombinations.forEach((combination, combIndex) => {
                // Replace * with actual values in inputs array
                const processedInputs = inputs.map((input, inputIndex) => {
                  const meta = inputsWithMetadata[inputIndex];
                  if (input === '*' && meta.storeAttribute && combination[meta.storeAttribute]) {
                    return combination[meta.storeAttribute];
                  }
                  return input;
                });
                
                scenarios.push({
                  name: `Flow_${startNode.id}_Path_${pathIndex + 1}_Combo_${combIndex + 1}`,
                  startInput: startInput,
                  inputs: processedInputs,
                  inputMetadata: inputsWithMetadata,
                  inputCombination: combination, // Store the combination used
                  startNode: startNode // Include START node for expected response extraction
                });
              });
            }
          });
        } catch (pathError) {
          console.error(`Error processing START node ${startNode.id}:`, pathError);
          // Add a basic scenario as fallback
          scenarios.push({
            name: `Flow_${startNode.id}_Basic`,
            startInput: Object.keys(startNode.transitions || {})[0] || 'default',
            inputs: [],
            startNode: startNode
          });
        }
      });
      
      console.log('Generated scenarios:', scenarios);
      
      if (scenarios.length === 0) {
        throw new Error('No scenarios could be generated from the flow');
      }

      const loadStages = generateLoadStages(config);

    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const flowCompletionRate = new Rate('flow_completion');
const stepFailureRate = new Rate('step_failures');
const actionNodeDuration = new Trend('action_node_duration');
const inputValidationRate = new Rate('input_validation_success');
const responseContentRate = new Rate('response_content_match');

// Per-step metrics for detailed analysis
const stepResponseTime = new Trend('step_response_time');
const stepErrorRate = new Rate('step_error_rate');
const stepSuccessRate = new Rate('step_success_rate');

// Flow-specific metrics
const flowTypeMetrics = {
  pin_flow: new Rate('pin_flow_success'),
  amount_flow: new Rate('amount_flow_success'),
  transfer_flow: new Rate('transfer_flow_success'),
  balance_flow: new Rate('balance_flow_success')
};

// Business metrics
const businessMetrics = {
  successful_transactions: new Rate('successful_transactions'),
  failed_transactions: new Rate('failed_transactions'),
  user_abandonment: new Rate('user_abandonment'),
  average_session_value: new Trend('average_session_value')
};

// Test configuration
export const options = {
  stages: ${JSON.stringify(loadStages, null, 4)},
  
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.05'],
    flow_completion: ['rate>0.9'],
    step_failures: ['rate<0.05'],
    input_validation_success: ['rate>0.95'],
    response_content_match: ['rate>0.95'],
    successful_transactions: ['rate>0.9'],
    user_abandonment: ['rate<0.1']
  },

  // Enhanced monitoring configuration
  setupTimeout: '60s',
  teardownTimeout: '60s',
  
  // Tags for better filtering in Grafana
  tags: {
    testType: 'ussd_load_test',
    environment: 'staging',
    version: '${new Date().toISOString().split('T')[0]}'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: '${config.baseUrl}',
  ENDPOINT: '${config.endpoint}',
  LOGIN: '${config.login}',
  PASSWORD: '${config.password}',
  PHONE_PREFIX: '${config.phonePrefix}',
  SESSION_ID_PREFIX: '${config.sessionIdPrefix}',
};

// Dynamic input configuration
const DYNAMIC_CONFIG = ${JSON.stringify(config.dynamicInputs, null, 2)};

// Flow scenarios
const FLOW_SCENARIOS = ${JSON.stringify(scenarios, null, 2)};

// Utility functions
function generatePhoneNumber() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return CONFIG.PHONE_PREFIX + suffix;
}

function generateSessionId() {
  return CONFIG.SESSION_ID_PREFIX + Math.floor(Math.random() * 100000000);
}

// Generate realistic dynamic inputs for USSD testing
function generateDynamicInput(inputType = 'amount', dynamicConfig = {}) {
  switch (inputType) {
    case 'amount':
      // Use custom amounts from config or defaults
      const amounts = dynamicConfig.customAmounts || [10, 25, 50, 100, 200, 500, 1000, 2000, 5000];
      return amounts[Math.floor(Math.random() * amounts.length)].toString();
      
    case 'pin':
      // Generate PIN with configured length
      const pinLength = dynamicConfig.pinLength || 4;
      const min = Math.pow(10, pinLength - 1);
      const max = Math.pow(10, pinLength) - 1;
      return (Math.floor(min + Math.random() * (max - min))).toString();
      
    case 'phone':
    case 'receiver_msisdn':
      // Generate receiver phone number using configured prefixes
      const receiverPrefixes = dynamicConfig.receiverPrefixes || ['777', '778', '779', '770'];
      const prefix = receiverPrefixes[Math.floor(Math.random() * receiverPrefixes.length)];
      const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
      return prefix + suffix;
      
    case 'account':
      // Generate account number with configured length range
      const accountMin = dynamicConfig.accountLength?.min || 8;
      const accountMax = dynamicConfig.accountLength?.max || 12;
      const length = accountMin + Math.floor(Math.random() * (accountMax - accountMin + 1));
      return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
      
    case 'name':
      // Generate names from predefined list
      const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Mary Brown', 'David Davis'];
      return names[Math.floor(Math.random() * names.length)];
      
    case 'reference':
      // Generate reference code based on configured format
      const format = dynamicConfig.referenceFormat || 'alphanumeric';
      const refLength = 6;
      let result = '';
      
      switch (format) {
        case 'numeric':
          for (let i = 0; i < refLength; i++) {
            result += Math.floor(Math.random() * 10);
          }
          break;
        case 'alpha':
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          for (let i = 0; i < refLength; i++) {
            result += letters.charAt(Math.floor(Math.random() * letters.length));
          }
          break;
        case 'alphanumeric':
        default:
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          for (let i = 0; i < refLength; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          break;
      }
      return result;
      
    case 'custom':
    default:
      // Default random number for unknown types
      return Math.floor(10 + Math.random() * 90).toString();
  }
}

// Enhanced function to replace * with appropriate dynamic input based on storeAttribute
function processFlowInput(input, stepIndex, flowContext = {}, dynamicConfig = {}, nodeStoreAttribute = null) {
  if (input !== '*' || !dynamicConfig.enableSmartInputs) {
    return input; // Return as-is if not a dynamic input or smart inputs disabled
  }
  
  // First, try to determine input type from storeAttribute
  if (nodeStoreAttribute) {
    const generatedValue = getInputTypeFromStoreAttribute(nodeStoreAttribute, dynamicConfig);
    if (generatedValue) {
      return generatedValue;
    }
  }
  
  // Fallback to default values if no specific configuration found
  return 'DEFAULT_VALUE';
}

// Function to map storeAttribute to input type and generate appropriate value
function getInputTypeFromStoreAttribute(storeAttribute, dynamicConfig) {
  if (!storeAttribute || !dynamicConfig.attributeConfigs) return null;
  
  const attrConfig = dynamicConfig.attributeConfigs[storeAttribute];
  if (!attrConfig) return null;
  
  // Generate value based on the specific configuration for this attribute
  switch (attrConfig.type) {
    case 'amount':
      const amounts = attrConfig.values || [100, 500, 1000];
      return amounts[Math.floor(Math.random() * amounts.length)].toString();
      
    case 'pin':
      const pins = attrConfig.values || ['1234', '5678'];
      return pins[Math.floor(Math.random() * pins.length)];
      
    case 'phone':
      const prefixes = attrConfig.prefixes || ['777'];
      const length = attrConfig.length || 10;
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const remainingLength = length - prefix.length;
      let suffix = '';
      for (let i = 0; i < remainingLength; i++) {
        suffix += Math.floor(Math.random() * 10);
      }
      return prefix + suffix;
      
    case 'account':
    case 'name':
    case 'reference':
    case 'custom':
    default:
      const values = attrConfig.values || ['DEFAULT'];
      return values[Math.floor(Math.random() * values.length)];
  }
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
  
  const fullUrl = \`\${url}?\${queryString}\`;
  
  const startTime = Date.now();
  const response = http.get(fullUrl);
  const duration = Date.now() - startTime;
  
  console.log(\`[\${new Date().toISOString()}] \${input} -> \${response.status} (\${duration}ms)\`);
  
  return { response, duration };
}

function validateUSSDResponse(response, expectedResponse = null, nodeType = null, isActionNode = false, stepIndex = 0, scenarioName = '') {
  const stepStart = Date.now();
  
  const checks = {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  };
  
  // Add tags for detailed analysis
  const tags = {
    scenario: scenarioName,
    step: stepIndex,
    node_type: nodeType || 'unknown',
    is_action_node: isActionNode
  };
  
  if (response.body) {
    // Validate no error indicators
    const hasErrors = ['error', 'invalid', 'failed', 'wrong', 'denied', 'unauthorized'].some(keyword => 
      response.body.toLowerCase().includes(keyword)
    );
    
    checks['no error indicators'] = (r) => !hasErrors;
    
    // Track error indicators separately
    errorRate.add(!hasErrors ? 0 : 1, tags);
    
    // For ACTION nodes, we don't validate content - just that we got a response
    if (isActionNode) {
      checks['action response received'] = (r) => {
        const hasResponse = r.body && r.body.length > 0;
        actionNodeDuration.add(Date.now() - stepStart, tags);
        return hasResponse;
      };
    } else if (expectedResponse && expectedResponse.trim().length > 0) {
      // ENHANCED CONTENT VALIDATION - Fixed string comparison
      checks['contains expected content'] = (r) => {
        // Clean both strings for robust comparison
        const cleanActual = r.body
          .replace(/\\r\\n/g, '\\n')           // Normalize line endings
          .replace(/\\r/g, '\\n')             // Handle single \\r
          .replace(/\\s+/g, ' ')             // Normalize whitespace
          .trim()                           // Remove leading/trailing whitespace
          .toLowerCase();                   // Case insensitive
          
        const cleanExpected = expectedResponse
          .replace(/\\r\\n/g, '\\n')           // Normalize line endings
          .replace(/\\r/g, '\\n')             // Handle single \\r
          .replace(/\\s+/g, ' ')             // Normalize whitespace
          .trim()                           // Remove leading/trailing whitespace
          .toLowerCase();                   // Case insensitive
        
        console.log(\`🔍 Comparing (cleaned):\`);
        console.log(\`   Expected: "\${cleanExpected}"\`);
        console.log(\`   Actual:   "\${cleanActual}"\`);
        
        let contentMatch = false;
        
        // 1. Try exact match (cleaned)
        if (cleanActual === cleanExpected) {
          contentMatch = true;
          console.log(\`✅ Exact match found\`);
        }
        // 2. Try contains match (cleaned)
        else if (cleanActual.includes(cleanExpected)) {
          contentMatch = true;
          console.log(\`✅ Contains match found\`);
        }
        // 3. Try reverse contains (expected contains actual)
        else if (cleanExpected.includes(cleanActual)) {
          contentMatch = true;
          console.log(\`✅ Reverse contains match found\`);
        }
        // 4. For menu responses, check structure
        else if (cleanExpected.includes('1.') || cleanExpected.includes('2.')) {
          const expectedMenuOptions = cleanExpected.match(/\\d+\\.\\s*[^\\n]*/g) || [];
          const actualMenuOptions = cleanActual.match(/\\d+\\.\\s*[^\\n]*/g) || [];
          
          if (expectedMenuOptions.length > 0 && actualMenuOptions.length > 0) {
            const matchingOptions = expectedMenuOptions.filter(expectedOption => 
              actualMenuOptions.some(actualOption => 
                actualOption.includes(expectedOption.substring(3, 15)) // Compare first few words
              )
            );
            contentMatch = matchingOptions.length >= Math.floor(expectedMenuOptions.length / 2);
            console.log(\`📋 Menu match: \${matchingOptions.length}/\${expectedMenuOptions.length} options matched\`);
          }
        }
        // 5. Keyword-based matching for partial content
        else {
          const expectedKeywords = cleanExpected
            .replace(/[^\\w\\s]/g, ' ')
            .split(/\\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['please', 'enter', 'your', 'the', 'and', 'for', 'with', 'thank', 'using'].includes(word));
            
          if (expectedKeywords.length > 0) {
            const matchedKeywords = expectedKeywords.filter(keyword => 
              cleanActual.includes(keyword)
            );
            contentMatch = matchedKeywords.length >= Math.ceil(expectedKeywords.length * 0.7); // 70% keyword match
            console.log(\`🔤 Keyword match: \${matchedKeywords.length}/\${expectedKeywords.length} keywords matched\`);
          }
        }
        
        // Enhanced logging for debugging failures
        if (!contentMatch) {
          console.log(\`❌ No match found using any method\`);
          console.log(\`📏 Length comparison - Expected: \${cleanExpected.length}, Actual: \${cleanActual.length}\`);
          console.log(\`🔤 Raw expected: \${JSON.stringify(expectedResponse)}\`);
          console.log(\`🔤 Raw actual: \${JSON.stringify(r.body)}\`);
        }
        
        // Track content match rate
        responseContentRate.add(contentMatch ? 1 : 0, tags);
        return contentMatch;
      };
    } else {
      // Fallback to generic validation if no specific expected response
      checks['contains valid content'] = (r) => {
        const validKeywords = ['menu', 'select', 'balance', 'account', 'thank', 'success', 'pin', 'amount', 'enter', 'please', 'service'];
        const hasValidContent = validKeywords.some(keyword => r.body.toLowerCase().includes(keyword));
        responseContentRate.add(hasValidContent ? 1 : 0, tags);
        return hasValidContent;
      };
    }
  }
  
  // Record step metrics
  stepResponseTime.add(response.timings.duration, tags);
  
  const result = check(response, checks, tags);
  
  // Track step success/failure
  stepSuccessRate.add(result ? 1 : 0, tags);
  stepErrorRate.add(result ? 0 : 1, tags);
  
  return result;
}

// Main test function
export default function () {
  const phoneNumber = generatePhoneNumber();
  const sessionId = generateSessionId();
  
  // Select random scenario
  const scenario = FLOW_SCENARIOS[Math.floor(Math.random() * FLOW_SCENARIOS.length)];
  
  console.log(\`🟦 Starting \${scenario.name} for \${phoneNumber}\`);
  
  const sessionStart = Date.now();
  let flowCompleted = false;
  let transactionValue = 0;
  let stepCount = 0;
  
  // Add session tags for tracking
  const sessionTags = {
    scenario_name: scenario.name,
    phone_number: phoneNumber.substring(0, 3) + 'XXX', // Anonymized
    session_type: scenario.name.includes('PIN') ? 'pin_flow' : 
                  scenario.name.includes('AMOUNT') ? 'amount_flow' : 'other_flow'
  };
  
  try {
    // Initiate USSD session with start node expected response
    const { response: startResponse } = makeUSSDRequest(
      sessionId, 
      phoneNumber, 
      scenario.startInput, 
      1
    );
    
    // Get expected response for start node validation from START node's nextNodePrompts
    const startExpectedResponse = scenario.startNode?.nextNodePrompts?.en || 
                                 scenario.inputMetadata?.[0]?.nodeText ||
                                 'Please enter your PIN:'; // Common USSD start prompt
    const startNodeType = 'START';
    const isStartActionNode = false; // START nodes are never ACTION nodes
    
    console.log(\`🔍 Start validation (\${startNodeType}) - Expected: "\${startExpectedResponse}"\`);
    console.log(\`📝 Actual response: "\${startResponse.body ? startResponse.body.substring(0, 100) : 'No response'}"\`);
    
    if (!validateUSSDResponse(startResponse, startExpectedResponse, startNodeType, isStartActionNode, 0, scenario.name)) {
      errorRate.add(1, sessionTags);
      stepFailureRate.add(1, { ...sessionTags, step: 0, step_type: 'START' });
      console.log(\`❌ Start node validation failed\`);
      return;
    }
    
    sleep(getThinkTime());
    
    // Process each input in the flow with realistic dynamic data
    const flowContext = {
      expectingAmount: false,
      expectingPin: false,
      expectingPhone: false
    };
    
    for (let i = 0; i < scenario.inputs.length; i++) {
      stepCount++;
      const originalInput = scenario.inputs[i];
      const inputMetadata = scenario.inputMetadata ? scenario.inputMetadata[i] : null;
      const storeAttribute = inputMetadata ? inputMetadata.storeAttribute : null;
      
      // Get expected response and node type for this step from inputMetadata
      let stepExpectedResponse = inputMetadata ? inputMetadata.nodeText : null;
      const currentNodeType = inputMetadata ? inputMetadata.nodeType : 'UNKNOWN';
      const nextNodeType = inputMetadata ? inputMetadata.nextNodeType : 'UNKNOWN';
      
      // Process dynamic inputs (* becomes realistic data based on storeAttribute)
      const processedInput = processFlowInput(originalInput, i, flowContext, DYNAMIC_CONFIG, storeAttribute);
      
      // Track transaction value for business metrics
      if (storeAttribute === 'AMOUNT' && processedInput !== '*') {
        transactionValue = parseInt(processedInput) || 0;
      }
      
      // Update flow context based on the input we're about to send
      if (originalInput === '*') {
        const attrConfig = DYNAMIC_CONFIG.attributeConfigs?.[storeAttribute];
        console.log(\`🔄 Dynamic input at step \${i + 1}: "\${originalInput}" → "\${processedInput}" (storeAttribute: \${storeAttribute || 'none'}, type: \${attrConfig?.type || 'fallback'})\`);
        
        // Log the specific type of data generated
        if (attrConfig?.type === 'amount') {
          console.log(\`💰 Generated amount from storeAttribute \${storeAttribute}: \${processedInput}\`);
        } else if (attrConfig?.type === 'pin') {
          console.log(\`🔐 Generated PIN from storeAttribute \${storeAttribute}: \${processedInput}\`);
        } else if (attrConfig?.type === 'phone') {
          console.log(\`📱 Generated phone number from storeAttribute \${storeAttribute}: \${processedInput}\`);
        } else {
          console.log(\`📝 Generated custom value from storeAttribute \${storeAttribute}: \${processedInput}\`);
        }
        
        // Track input validation success
        inputValidationRate.add(1, { ...sessionTags, input_type: attrConfig?.type || 'unknown' });
      }
      
      const stepStartTime = Date.now();
      const { response } = makeUSSDRequest(sessionId, phoneNumber, processedInput, 0);
      const stepDuration = Date.now() - stepStartTime;
      
      console.log(\`🔍 Step \${i + 1} (\${currentNodeType} → \${nextNodeType}) validation - Expected: "\${stepExpectedResponse || 'No specific expectation'}"\`);
      console.log(\`📝 Actual response: "\${response.body ? response.body.substring(0, 100) : 'No response'}"\`);
      
      if (inputMetadata && inputMetadata.actionNodeId) {
        console.log(\`⚙️ Step includes ACTION processing (\${inputMetadata.actionNodeId}): Validating final response\`);
      }
      
      // Enhanced step validation with detailed tracking
      const stepTags = {
        ...sessionTags,
        step: i + 1,
        step_type: currentNodeType,
        next_step_type: nextNodeType,
        store_attribute: storeAttribute || 'none',
        has_action_node: !!(inputMetadata && inputMetadata.actionNodeId)
      };
      
      // Normal validation (ACTION nodes are now properly resolved in path generation)
      if (!validateUSSDResponse(response, stepExpectedResponse, nextNodeType, false, i + 1, scenario.name)) {
        errorRate.add(1, stepTags);
        stepFailureRate.add(1, stepTags);
        console.log(\`❌ Flow failed at step \${i + 1} (\${currentNodeType} → \${nextNodeType}) with input: \${processedInput}\`);
        console.log(\`❌ Expected: "\${stepExpectedResponse || 'No expectation'}"\`);
        console.log(\`❌ Got: "\${response.body ? response.body.substring(0, 200) : 'No response'}"\`);
        
        // Track abandonment
        businessMetrics.user_abandonment.add(1, stepTags);
        break;
      }
      
      if (i === scenario.inputs.length - 1) {
        flowCompleted = true;
        console.log(\`✅ Flow completed for \${phoneNumber}\`);
        
        // Track successful transaction
        if (transactionValue > 0) {
          businessMetrics.successful_transactions.add(1, { ...sessionTags, transaction_value: transactionValue });
          businessMetrics.average_session_value.add(transactionValue, sessionTags);
        } else {
          businessMetrics.successful_transactions.add(1, sessionTags);
        }
        
        // Track flow type success
        if (sessionTags.session_type === 'pin_flow') {
          flowTypeMetrics.pin_flow.add(1, sessionTags);
        } else if (sessionTags.session_type === 'amount_flow') {
          flowTypeMetrics.amount_flow.add(1, sessionTags);
        }
      }
      
      sleep(getStepDelay());
    }
    
    if (!flowCompleted && stepCount > 0) {
      businessMetrics.failed_transactions.add(1, { ...sessionTags, failure_step: stepCount });
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
    // Start new session after completion
    if (flowCompleted) {
      sleep(getSessionDelay());
      // Recursively start new flow (simulating continuous usage)
      if (Math.random() < 0.7) { // 70% chance to start new flow
        console.log(\`🔄 Starting new flow for \${phoneNumber}\`);
        // Note: This would ideally call the main function again or create a new session
      }
    }
    
  } catch (error) {
    console.error(\`Error in \${scenario.name}:\`, error.message);
    errorRate.add(1, sessionTags);
    flowCompletionRate.add(0, sessionTags);
    businessMetrics.failed_transactions.add(1, { ...sessionTags, error_type: 'exception' });
  }
  
  sleep(getSessionDelay());
}

export function setup() {
  console.log('🚀 USSD Load Test Started');
  console.log(\`Target: \${CONFIG.BASE_URL}\${CONFIG.ENDPOINT}\`);
  console.log(\`Scenarios: \${FLOW_SCENARIOS.length}\`);
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('📊 Load Test Completed');
  console.log(\`Duration: \${Date.now() - new Date(data.timestamp).getTime()}ms\`);
}`;
    } catch (error) {
      console.error('Error creating K6 script:', error);
      throw new Error(`Failed to create K6 script: ${error.message}`);
    }
  };

  const generateLoadStages = (config) => {
    const profiles = {
      light: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 }
      ],
      moderate: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      heavy: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 }
      ],
      stress: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 300 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 0 }
      ]
    };
    
    return profiles[config.loadProfile] || profiles.moderate;
  };

  const findFlowPaths = (startNode, allNodes) => {
    const paths = [];
    const maxDepth = 20; // Prevent infinite loops
    
    const traverse = (currentNode, currentPath, visited = new Set()) => {
      if (visited.has(currentNode.id) || currentPath.length > maxDepth) {
        return;
      }
      
      const newVisited = new Set(visited);
      newVisited.add(currentNode.id);
      
      // If this is an END node, complete the path
      if (!currentNode.transitions || Object.keys(currentNode.transitions).length === 0 || 
          (currentNode.type && currentNode.type.toLowerCase() === 'end')) {
        paths.push([...currentPath]);
        return;
      }
      
      // Traverse each transition (each possible user input)
      Object.entries(currentNode.transitions).forEach(([userInput, nextNodeId]) => {
        const nextNode = allNodes.find(n => n.id === nextNodeId);
        if (nextNode) {
          
          // Special handling for ACTION nodes - they don't require user input
          if (nextNode.type === 'ACTION') {
            // For ACTION nodes, automatically follow the success path (200 status)
            // and create a step that represents INPUT → ACTION → SUCCESS_TARGET
            const actionNode = nextNode;
            const successTarget = actionNode.transitions['200'];
            const successNode = allNodes.find(n => n.id === successTarget);
            
            if (successNode && actionNode.nextNodesMetadata && actionNode.nextNodesMetadata['200']) {
              const step = {
                nodeId: currentNode.id,
                nodeType: currentNode.type,
                userInput: userInput,
                storeAttribute: currentNode.storeAttribute || null,
                
                // Expected response comes from ACTION's success target
                expectedResponse: actionNode.nextNodesMetadata['200'].nextNodePrompts?.en || '',
                nextNodeType: actionNode.nextNodesMetadata['200'].nextNodeType || successNode.type,
                
                // Include ACTION info for reference
                actionNodeId: actionNode.id,
                templateId: actionNode.templateId || null
              };
              
              const newPath = [...currentPath, step];
              // Continue traversal from the success target node
              traverse(successNode, newPath, newVisited);
            }
          } else {
            // Normal node processing (non-ACTION)
            const step = {
              nodeId: currentNode.id,
              nodeType: currentNode.type,
              userInput: userInput,
              storeAttribute: currentNode.storeAttribute || null,
              
              // Get the expected response from nextNodesMetadata or nextNodePrompts
              expectedResponse: getExpectedResponse(currentNode, userInput, nextNode),
              nextNodeType: getNextNodeType(currentNode, userInput, nextNode),
              
              // Include template info for actions
              templateId: currentNode.templateId || null
            };
            
            const newPath = [...currentPath, step];
            traverse(nextNode, newPath, newVisited);
          }
        }
      });
    };
    
    // Helper function to get expected response/prompt
    const getExpectedResponse = (currentNode, userInput, nextNode) => {
      console.log('Getting expected response for: ' + currentNode.id + ' -(' + userInput + ')-> ' + (nextNode ? nextNode.id : 'null'));
      console.log('Current node type: ' + currentNode.type + ', Next node type: ' + (nextNode ? nextNode.type : 'null'));
      
      // For ACTION nodes, we don't expect specific prompts - they process and redirect
      if (nextNode && nextNode.type === 'ACTION') {
        console.log('Next node is ACTION - no prompt expected, will validate at subsequent node');
        return ''; // ACTION nodes don't return prompts
      }
      
      // Priority 1: Check if current node has nextNodesMetadata for this specific input
      if (currentNode.nextNodesMetadata && currentNode.nextNodesMetadata[userInput]) {
        const metadata = currentNode.nextNodesMetadata[userInput];
        if (metadata.nextNodePrompts && metadata.nextNodePrompts.en) {
          console.log('Found expected response in nextNodesMetadata[' + userInput + ']: "' + metadata.nextNodePrompts.en + '"');
          return metadata.nextNodePrompts.en;
        }
      }
      
      // Priority 2: Check if current node has nextNodePrompts (for simple transitions)
      if (currentNode.nextNodePrompts && currentNode.nextNodePrompts.en) {
        console.log('Found expected response in nextNodePrompts: "' + currentNode.nextNodePrompts.en + '"');
        return currentNode.nextNodePrompts.en;
      }
      
      // Priority 3: Check if next node has its own prompts (direct node prompts)
      if (nextNode && nextNode.data && nextNode.data.config && nextNode.data.config.prompts && nextNode.data.config.prompts.en) {
        console.log('Found expected response in nextNode.data.config.prompts: "' + nextNode.data.config.prompts.en + '"');
        return nextNode.data.config.prompts.en;
      }
      
      // Priority 4: For USSD flow format, check nextNode prompts directly  
      if (nextNode && nextNode.prompts && nextNode.prompts.en) {
        console.log('Found expected response in nextNode.prompts: "' + nextNode.prompts.en + '"');
        return nextNode.prompts.en;
      }
      
      // Priority 5: Fallback based on node type and storeAttribute
      if (nextNode) {
        let fallbackResponse = '';
        switch (nextNode.type) {
          case 'END':
            fallbackResponse = 'Thank you for using our service!';
            break;
          case 'MENU':
            fallbackResponse = 'Please select an option from the menu';
            break;
          case 'INPUT':
            // Use storeAttribute to create meaningful prompt
            const storeAttr = nextNode.storeAttribute || 'input';
            if (storeAttr === 'PIN') {
              fallbackResponse = 'Please enter your PIN:';
            } else if (storeAttr === 'AMOUNT') {
              fallbackResponse = 'Please enter your amount:';
            } else if (storeAttr === 'RCMSISDN') {
              fallbackResponse = 'Please enter your msisdn:';
            } else {
              fallbackResponse = 'Please enter your ' + storeAttr.toLowerCase() + ':';
            }
            break;
          case 'ACTION':
            fallbackResponse = ''; // Actions typically don't show prompts, they process and redirect
            break;
          default:
            fallbackResponse = 'Please proceed';
            break;
        }
        
        if (fallbackResponse) {
          console.log('Using fallback response for ' + nextNode.type + ': "' + fallbackResponse + '"');
        }
        return fallbackResponse;
      }
      
      console.log('No expected response found, using default');
      return 'Please proceed';
    };
    
    // Helper function to get next node type
    const getNextNodeType = (currentNode, userInput, nextNode) => {
      if (currentNode.nextNodesMetadata && currentNode.nextNodesMetadata[userInput]) {
        return currentNode.nextNodesMetadata[userInput].nextNodeType || nextNode.type;
      }
      return nextNode.type;
    };
    
    try {
      // Start traversal WITHOUT adding an initial DIAL step
      // The START node's transitions already define the proper flow
      traverse(startNode, []);
      
      console.log('findFlowPaths completed, found paths:', paths.length);
      paths.forEach((path, index) => {
        console.log(`Path ${index + 1}:`, path.map(step => 
          `${step.userInput} -> ${step.expectedResponse?.substring(0, 50)}...`
        ).join(' | '));
      });
      
      return paths;
    } catch (error) {
      console.error('Error in findFlowPaths:', error);
      return []; // Return empty array as fallback
    }
  };

  const extractInputsFromPath = (path) => {
    const inputs = [];
    
    // Each path now contains steps with userInput and expectedResponse
    // Skip START nodes - only include actual user input steps
    path.forEach((step, index) => {
      // Only include steps that represent actual user inputs
      // Skip START (handled by startInput)
      // ACTION nodes are now resolved in traversal, so they won't appear here
      if (step.nodeType !== 'START') {
        inputs.push({
          input: step.userInput,
          storeAttribute: step.storeAttribute || null,
          nodeType: step.nodeType || null,
          nodeText: step.expectedResponse || '',
          nextNodeType: step.nextNodeType || null,
          templateId: step.templateId || null,
          actionNodeId: step.actionNodeId || null // Include ACTION node reference if present
        });
      }
    });
    
    return inputs;
  };

  const downloadScript = () => {
    if (!generatedScript) return;
    
    const blob = new Blob([generatedScript], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ussd-load-test-${Date.now()}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!generatedScript) return;
    
    navigator.clipboard.writeText(generatedScript).then(() => {
      alert('K6 script copied to clipboard!');
    });
  };

  return (
    <div className="k6-generator-modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>🚀 K6 Load Test Generator</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="config-section">
            <h3>USSD Gateway Configuration</h3>
            <div className="config-grid">
              <div className="config-item">
                <label>Base URL:</label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="http://localhost:80"
                />
              </div>
              
              <div className="config-item">
                <label>Endpoint:</label>
                <input
                  type="text"
                  value={config.endpoint}
                  onChange={(e) => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="/MenuManagement/RequestReceiver"
                />
              </div>
              
              <div className="config-item">
                <label>Login:</label>
                <input
                  type="text"
                  value={config.login}
                  onChange={(e) => setConfig(prev => ({ ...prev, login: e.target.value }))}
                  placeholder="Ussd_Bearer1"
                />
              </div>
              
              <div className="config-item">
                <label>Password:</label>
                <input
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="test"
                />
              </div>
              
              <div className="config-item">
                <label>Phone Prefix:</label>
                <input
                  type="text"
                  value={config.phonePrefix}
                  onChange={(e) => setConfig(prev => ({ ...prev, phonePrefix: e.target.value }))}
                  placeholder="777"
                />
              </div>
              
              <div className="config-item">
                <label>Session ID Prefix:</label>
                <input
                  type="text"
                  value={config.sessionIdPrefix}
                  onChange={(e) => setConfig(prev => ({ ...prev, sessionIdPrefix: e.target.value }))}
                  placeholder="99"
                />
              </div>
            </div>
          </div>
          
          <div className="config-section">
            <h3>Load Testing Profile</h3>
            <div className="profile-grid">
              {Object.entries(loadProfiles).map(([key, profile]) => (
                <div 
                  key={key} 
                  className={`profile-card ${config.loadProfile === key ? 'selected' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, loadProfile: key }))}
                >
                  <h4>{profile.name}</h4>
                  <p>{profile.description}</p>
                  <div className="profile-stats">
                    <span>Max Users: {profile.maxUsers}</span>
                    <span>Duration: {profile.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* TPS Configuration Section */}
          <div className="config-section">
            <h3>🎯 Test Mode Configuration</h3>
            <div className="test-mode-selection">
              <div className="mode-buttons">
                <button 
                  className={`mode-btn ${config.testMode === 'vu' ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, testMode: 'vu' }))}
                >
                  <div className="mode-icon">👥</div>
                  <div className="mode-info">
                    <h4>Virtual Users (VU)</h4>
                    <p>Simulate concurrent users</p>
                  </div>
                </button>
                <button 
                  className={`mode-btn ${config.testMode === 'tps' ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, testMode: 'tps' }))}
                >
                  <div className="mode-icon">⚡</div>
                  <div className="mode-info">
                    <h4>Transactions/Second (TPS)</h4>
                    <p>Benchmark system throughput</p>
                  </div>
                </button>
              </div>
            </div>
            
            {config.testMode === 'tps' && (
              <div className="tps-configuration">
                <div className="tps-presets">
                  <h4>📊 TPS Test Profiles</h4>
                  <div className="tps-preset-grid">
                    {[
                      { key: 'low_tps', name: 'Low TPS', targetTPS: 10, duration: '2m', icon: '🐌', color: '#10B981' },
                      { key: 'moderate_tps', name: 'Moderate TPS', targetTPS: 50, duration: '5m', icon: '🚶', color: '#3B82F6' },
                      { key: 'high_tps', name: 'High TPS', targetTPS: 100, duration: '10m', icon: '🏃', color: '#F59E0B' },
                      { key: 'stress_tps', name: 'Stress TPS', targetTPS: 200, duration: '15m', icon: '🔥', color: '#EF4444' },
                      { key: 'custom_tps', name: 'Custom TPS', targetTPS: 0, duration: '10m', icon: '⚙️', color: '#6B7280' }
                    ].map(preset => (
                      <div
                        key={preset.key}
                        className={`tps-preset-card ${config.tpsConfig.testType === preset.key ? 'selected' : ''}`}
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          tpsConfig: {
                            ...prev.tpsConfig,
                            testType: preset.key,
                            targetTPS: preset.targetTPS,
                            duration: preset.duration
                          }
                        }))}
                        style={{ borderColor: preset.color }}
                      >
                        <div className="tps-preset-icon" style={{ color: preset.color }}>
                          {preset.icon}
                        </div>
                        <div className="tps-preset-info">
                          <h5>{preset.name}</h5>
                          {preset.key !== 'custom_tps' && (
                            <div className="tps-preset-stats">
                              <span>TPS: {preset.targetTPS}</span>
                              <span>Duration: {preset.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {config.tpsConfig.testType === 'custom_tps' && (
                  <div className="custom-tps-config">
                    <h4>⚙️ Custom TPS Configuration</h4>
                    <div className="tps-config-grid">
                      <div className="config-field">
                        <label>Target TPS:</label>
                        <input
                          type="number"
                          value={config.tpsConfig.targetTPS}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            tpsConfig: { ...prev.tpsConfig, targetTPS: parseInt(e.target.value) }
                          }))}
                          min="1"
                          max="1000"
                        />
                      </div>
                      <div className="config-field">
                        <label>Test Duration:</label>
                        <select
                          value={config.tpsConfig.duration}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            tpsConfig: { ...prev.tpsConfig, duration: e.target.value }
                          }))}
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
                
                <div className="advanced-tps-config">
                  <h4>🔧 Advanced TPS Configuration</h4>
                  <div className="tps-config-grid">
                    <div className="config-field">
                      <label>
                        Avg Transaction Time (seconds):
                        <span className="help-text">Time for one complete USSD flow</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.tpsConfig.avgTransactionTime}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          tpsConfig: { ...prev.tpsConfig, avgTransactionTime: parseFloat(e.target.value) }
                        }))}
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
                        value={config.tpsConfig.thinkTime}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          tpsConfig: { ...prev.tpsConfig, thinkTime: parseFloat(e.target.value) }
                        }))}
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
                        value={config.tpsConfig.maxVUs}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          tpsConfig: { ...prev.tpsConfig, maxVUs: parseInt(e.target.value) }
                        }))}
                        min="1"
                        max="2000"
                      />
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const targetTPS = config.tpsConfig.testType === 'custom_tps' ? config.tpsConfig.targetTPS : 
                    config.tpsConfig.testType === 'low_tps' ? 10 :
                    config.tpsConfig.testType === 'moderate_tps' ? 50 :
                    config.tpsConfig.testType === 'high_tps' ? 100 :
                    config.tpsConfig.testType === 'stress_tps' ? 200 : 50;
                  
                  const totalTime = config.tpsConfig.avgTransactionTime + config.tpsConfig.thinkTime;
                  const requiredVUs = Math.ceil(targetTPS * totalTime);
                  const finalVUs = Math.min(requiredVUs, config.tpsConfig.maxVUs);
                  const actualTPS = finalVUs / totalTime;
                  const isVULimited = requiredVUs > config.tpsConfig.maxVUs;
                  
                  return (
                    <div className="tps-analysis">
                      <h4>📊 TPS Analysis Results</h4>
                      <div className="tps-analysis-grid">
                        <div className="analysis-card">
                          <h5>🎯 Target TPS</h5>
                          <div className="metric-value">{targetTPS}</div>
                          <div className="metric-unit">transactions/sec</div>
                        </div>
                        <div className="analysis-card">
                          <h5>👥 Required VUs</h5>
                          <div className="metric-value">{finalVUs}</div>
                          <div className="metric-unit">virtual users</div>
                          {isVULimited && <div className="warning">⚠️ VU limited</div>}
                        </div>
                        <div className="analysis-card">
                          <h5>⚡ Actual TPS</h5>
                          <div className="metric-value">{actualTPS.toFixed(1)}</div>
                          <div className="metric-unit">transactions/sec</div>
                        </div>
                        <div className="analysis-card">
                          <h5>📈 Utilization</h5>
                          <div className="metric-value">{((config.tpsConfig.avgTransactionTime / totalTime) * 100).toFixed(1)}%</div>
                          <div className="metric-unit">CPU utilization</div>
                        </div>
                      </div>
                      
                      {isVULimited && (
                        <div className="warning-message">
                          ⚠️ <strong>VU Limitation Detected:</strong> To achieve {targetTPS} TPS, 
                          you need {requiredVUs} VUs, but max is set to {config.tpsConfig.maxVUs}. 
                          Actual TPS will be ~{actualTPS.toFixed(1)}.
                        </div>
                      )}
                      
                      <div className="formula-explanation">
                        <h5>📐 TPS Calculation Formula</h5>
                        <div className="formula-box">
                          <code>TPS = VUs ÷ (Transaction Time + Think Time)</code><br/>
                          <code>Required VUs = Target TPS × (Transaction Time + Think Time)</code>
                        </div>
                        <div className="formula-example">
                          <strong>Example:</strong> For {targetTPS} TPS with {config.tpsConfig.avgTransactionTime}s transaction time 
                          and {config.tpsConfig.thinkTime}s think time = {finalVUs} VUs needed
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <div className="config-section">
            <h3>Dynamic Input Configuration</h3>
            <div className="dynamic-inputs-config">
              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={config.dynamicInputs.enableSmartInputs}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dynamicInputs: {
                        ...prev.dynamicInputs,
                        enableSmartInputs: e.target.checked
                      }
                    }))}
                  />
                  Enable Smart Dynamic Inputs (replace * with realistic data based on storeAttribute)
                </label>
              </div>
              
              {config.dynamicInputs.enableSmartInputs && (
                <>
                  {/* Dial Code Configuration */}
                  <div className="config-item">
                    <h4 style={{ marginBottom: '12px', color: '#374151' }}>
                      🔢 Dial Code Configuration
                    </h4>
                    <div style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '20px'
                    }}>
                      <label>Dial Code (START node input):</label>
                      <input
                        type="text"
                        value={config.dialCode || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dialCode: e.target.value
                        }))}
                        placeholder="123"
                        style={{
                          width: '100px',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          marginLeft: '8px'
                        }}
                      />
                      <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                        The code users dial to access your USSD service (e.g., *123# → enter "123")
                      </small>
                    </div>
                  </div>

                  {flowStoreAttributes.length === 0 ? (
                    <div className="config-item">
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        No storeAttribute values found in your flow. Add storeAttribute to your INPUT nodes to configure dynamic inputs.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="config-item">
                        <h4>Found storeAttributes in your flow:</h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                          {flowStoreAttributes.map(attr => (
                            <span key={attr} style={{ 
                              background: '#e0e7ff', 
                              color: '#3730a3', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {flowStoreAttributes.map(attr => {
                        const attrConfig = config.dynamicInputs.attributeConfigs?.[attr];
                        const attrType = attrConfig?.type || 'custom';
                        
                        return (
                          <div key={attr} className="config-item" style={{ 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '6px', 
                            padding: '16px',
                            backgroundColor: '#ffffff'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ margin: '0', color: '#374151' }}>
                                storeAttribute: {attr}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Type:</label>
                                <select
                                  value={attrType}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    let defaultConfig = {};
                                    
                                    switch (newType) {
                                      case 'amount':
                                        defaultConfig = { type: 'amount', values: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000] };
                                        break;
                                      case 'pin':
                                        defaultConfig = { type: 'pin', values: ['1234', '5678', '1111', '0000', '9999'] };
                                        break;
                                      case 'phone':
                                        defaultConfig = { type: 'phone', prefixes: ['777', '778', '779', '770'], length: 10 };
                                        break;
                                      case 'account':
                                        defaultConfig = { type: 'account', values: ['123456789', '987654321', '111222333'] };
                                        break;
                                      case 'name':
                                        defaultConfig = { type: 'name', values: ['John Doe', 'Jane Smith', 'Alice Johnson'] };
                                        break;
                                      case 'reference':
                                        defaultConfig = { type: 'reference', values: ['REF001', 'TXN123', 'CODE456'] };
                                        break;
                                      default:
                                        defaultConfig = { type: 'custom', values: [`${attr}_VALUE1`, `${attr}_VALUE2`] };
                                    }
                                    
                                    setConfig(prev => ({
                                      ...prev,
                                      dynamicInputs: {
                                        ...prev.dynamicInputs,
                                        attributeConfigs: {
                                          ...prev.dynamicInputs.attributeConfigs,
                                          [attr]: defaultConfig
                                        }
                                      }
                                    }));
                                  }}
                                  style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px' }}
                                >
                                  <option value="amount">💰 Amount</option>
                                  <option value="pin">🔐 PIN/Password</option>
                                  <option value="phone">📱 Phone Number</option>
                                  <option value="account">🏦 Account Number</option>
                                  <option value="name">👤 Name</option>
                                  <option value="reference">🔖 Reference Code</option>
                                  <option value="custom">📝 Custom Values</option>
                                </select>
                              </div>
                            </div>
                            
                            {/* Dynamic configuration based on type */}
                            {attrType === 'amount' && (
                              <>
                                <label>Amount Values (comma-separated):</label>
                                <input
                                  type="text"
                                  value={attrConfig?.values?.join(', ') || ''}
                                  onChange={(e) => {
                                    const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                                    setConfig(prev => ({
                                      ...prev,
                                      dynamicInputs: {
                                        ...prev.dynamicInputs,
                                        attributeConfigs: {
                                          ...prev.dynamicInputs.attributeConfigs,
                                          [attr]: { type: 'amount', values: values }
                                        }
                                      }
                                    }));
                                  }}
                                  placeholder="10, 25, 50, 100, 200, 500, 1000, 2000, 5000"
                                />
                                <small>💰 Predefined amounts that will be randomly selected during testing</small>
                              </>
                            )}
                            
                            {attrType === 'pin' && (
                              <>
                                <label>PIN Values (comma-separated):</label>
                                <input
                                  type="text"
                                  value={attrConfig?.values?.join(', ') || ''}
                                  onChange={(e) => {
                                    const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                                    setConfig(prev => ({
                                      ...prev,
                                      dynamicInputs: {
                                        ...prev.dynamicInputs,
                                        attributeConfigs: {
                                          ...prev.dynamicInputs.attributeConfigs,
                                          [attr]: { type: 'pin', values: values }
                                        }
                                      }
                                    }));
                                  }}
                                  placeholder="1234, 5678, 1111, 0000, 9999"
                                />
                                <small>🔐 Predefined PINs that will be randomly selected during testing</small>
                              </>
                            )}
                            
                            {attrType === 'phone' && (
                              <>
                                <div style={{ marginBottom: '12px' }}>
                                  <label>Phone Number Prefixes (comma-separated):</label>
                                  <input
                                    type="text"
                                    value={attrConfig?.prefixes?.join(', ') || ''}
                                    onChange={(e) => {
                                      const prefixes = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                                      setConfig(prev => ({
                                        ...prev,
                                        dynamicInputs: {
                                          ...prev.dynamicInputs,
                                          attributeConfigs: {
                                            ...prev.dynamicInputs.attributeConfigs,
                                            [attr]: { 
                                              type: 'phone', 
                                              prefixes: prefixes,
                                              length: attrConfig?.length || 10
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="777, 778, 779, 770"
                                  />
                                  <small>📱 Phone number prefixes for generating random receiver numbers</small>
                                </div>
                                
                                <div>
                                  <label>Total Length:</label>
                                  <select
                                    value={attrConfig?.length || 10}
                                    onChange={(e) => setConfig(prev => ({
                                      ...prev,
                                      dynamicInputs: {
                                        ...prev.dynamicInputs,
                                        attributeConfigs: {
                                          ...prev.dynamicInputs.attributeConfigs,
                                          [attr]: {
                                            type: 'phone',
                                            prefixes: attrConfig?.prefixes || ['777'],
                                            length: parseInt(e.target.value)
                                          }
                                        }
                                      }
                                    }))}
                                  >
                                    <option value={10}>10 digits (7771234567)</option>
                                    <option value={11}>11 digits (77712345678)</option>
                                    <option value={12}>12 digits (777123456789)</option>
                                  </select>
                                  <small>Total phone number length including prefix</small>
                                </div>
                              </>
                            )}
                            
                            {(attrType === 'account' || attrType === 'name' || attrType === 'reference' || attrType === 'custom') && (
                              <>
                                <label>{attrType === 'account' ? 'Account Numbers' : 
                                       attrType === 'name' ? 'Names' : 
                                       attrType === 'reference' ? 'Reference Codes' : 
                                       'Custom Values'} (comma-separated):</label>
                                <input
                                  type="text"
                                  value={attrConfig?.values?.join(', ') || ''}
                                  onChange={(e) => {
                                    const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                                    setConfig(prev => ({
                                      ...prev,
                                      dynamicInputs: {
                                        ...prev.dynamicInputs,
                                        attributeConfigs: {
                                          ...prev.dynamicInputs.attributeConfigs,
                                          [attr]: { type: attrType, values: values }
                                        }
                                      }
                                    }));
                                  }}
                                  placeholder={
                                    attrType === 'account' ? '123456789, 987654321, 111222333' :
                                    attrType === 'name' ? 'John Doe, Jane Smith, Alice Johnson' :
                                    attrType === 'reference' ? 'REF001, TXN123, CODE456' :
                                    `${attr}_VALUE1, ${attr}_VALUE2, ${attr}_VALUE3`
                                  }
                                />
                                <small>
                                  {attrType === 'account' && '🏦 Account numbers for testing'}
                                  {attrType === 'name' && '👤 Names for beneficiary/user testing'}
                                  {attrType === 'reference' && '🔖 Reference codes for transactions'}
                                  {attrType === 'custom' && `📝 Custom values for ${attr} attribute`}
                                </small>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dynamic Menu Configuration Section */}
          {Object.keys(dynamicMenus).length > 0 && (
            <div className="config-section">
              <h3>🎛️ Dynamic Menu Configuration</h3>
              <div style={{
                background: '#f0f9ff',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #e0f2fe'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0369a1' }}>
                  📍 <strong>{Object.keys(dynamicMenus).length} DYNAMIC-MENU node(s) detected</strong>
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                  Configure the actual menu content for better assertion accuracy in load tests.
                </p>
              </div>
              
              {Object.entries(dynamicMenus).map(([nodeId, menuConfig]) => (
                <div key={nodeId} style={{
                  background: '#fefefe',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    color: '#374151',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: '#ddd6fe',
                      color: '#5b21b6',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      DYNAMIC-MENU
                    </span>
                    {menuConfig.nodeName}
                  </h4>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '6px',
                      color: '#374151'
                    }}>
                      Menu Content (for assertion):
                    </label>
                    <textarea
                      value={menuConfig.menuContent}
                      onChange={(e) => updateDynamicMenuContent(nodeId, e.target.value)}
                      placeholder={menuConfig.sampleContent}
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        resize: 'vertical'
                      }}
                    />
                    <small style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#6b7280',
                      fontSize: '12px'
                    }}>
                      💡 Enter the exact menu options as they appear in USSD responses.
                      Example: "1.Electricity Board\n2.Water Supply Dept\n3.Mobile Recharge"
                    </small>
                  </div>
                  
                  {!menuConfig.menuContent.trim() && (
                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '13px',
                      color: '#92400e'
                    }}>
                      ⚠️ <strong>No content configured</strong> - Will use default assertion: "Please select an option:"
                    </div>
                  )}
                  
                  {menuConfig.menuContent.trim() && (
                    <div style={{
                      background: '#d1fae5',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '13px',
                      color: '#065f46'
                    }}>
                      ✅ <strong>Custom content configured</strong> - K6 tests will assert against your menu content
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="config-section">
            <h3>Flow Analysis</h3>
            <div className="flow-stats">
              <div className="stat-item">
                <span className="stat-label">Total Nodes:</span>
                <span className="stat-value">{nodes.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">START Nodes:</span>
                <span className="stat-value">{nodes.filter(n => n.data.type === 'START').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">END Nodes:</span>
                <span className="stat-value">{nodes.filter(n => n.data.type === 'END').length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Edges:</span>
                <span className="stat-value">{edges.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="generate-btn"
            onClick={generateK6Script}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Generating...' : '🔧 Generate K6 Script'}
          </button>
          
          {generatedScript && (
            <div className="script-actions">
              <button className="download-btn" onClick={downloadScript}>
                📥 Download Script
              </button>
              <button className="copy-btn" onClick={copyToClipboard}>
                📋 Copy to Clipboard
              </button>
              <button className="view-cases-btn" onClick={() => setShowTestCases(!showTestCases)}>
                🔍 {showTestCases ? 'Hide' : 'View'} Test Cases
              </button>
            </div>
          )}
        </div>
        
        {generatedScript && (
          <div className="script-preview">
            <h3>Generated K6 Script Preview</h3>
            <pre className="script-content">
              {generatedScript.slice(0, 1000)}...
            </pre>
            <p className="script-info">
              Script generated successfully! Contains {generatedScript.split('\n').length} lines.
            </p>
            
            {/* InfluxDB + Grafana Command Instructions */}
            <div className="influxdb-commands">
              <h4>🚀 Run with InfluxDB + Grafana Real-time Monitoring:</h4>
              
              <div className="command-section">
                <h5>📊 Basic InfluxDB Output:</h5>
                <div className="command-box">
                  <code>k6 run --out influxdb=http://localhost:8086/k6 your-script.js</code>
                  <button 
                    className="copy-command-btn"
                    onClick={() => navigator.clipboard.writeText('k6 run --out influxdb=http://localhost:8086/k6 your-script.js')}
                    title="Copy command"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="command-section">
                <h5>🎯 Enhanced with Tags & Multiple Outputs:</h5>
                <div className="command-box">
                  <code>
{`k6 run \\
  --out influxdb=http://localhost:8086/k6 \\
  --out json=results.json \\
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \\
  --tag environment=staging \\
  your-script.js`}
                  </code>
                  <button 
                    className="copy-command-btn"
                    onClick={() => navigator.clipboard.writeText(`k6 run \\
  --out influxdb=http://localhost:8086/k6 \\
  --out json=results.json \\
  --tag testid=ussd_test_$(date +%Y%m%d_%H%M%S) \\
  --tag environment=staging \\
  your-script.js`)}
                    title="Copy command"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="command-section">
                <h5>🐳 Docker K6 with InfluxDB:</h5>
                <div className="command-box">
                  <code>
{`docker run --rm -i grafana/k6:latest run \\
  --out influxdb=http://host.docker.internal:8086/k6 \\
  --tag testid=ussd_docker_test \\
  - < your-script.js`}
                  </code>
                  <button 
                    className="copy-command-btn"
                    onClick={() => navigator.clipboard.writeText(`docker run --rm -i grafana/k6:latest run \\
  --out influxdb=http://host.docker.internal:8086/k6 \\
  --tag testid=ussd_docker_test \\
  - < your-script.js`)}
                    title="Copy command"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="setup-links">
                <h5>📋 Setup Instructions:</h5>
                <div className="link-buttons">
                  <button 
                    className="setup-link-btn"
                    onClick={() => window.open('https://grafana.com/grafana/dashboards/2587', '_blank')}
                  >
                    📊 Import K6 Grafana Dashboard (ID: 2587)
                  </button>
                  <div className="setup-steps">
                    <p><strong>Quick Setup:</strong></p>
                    <ol>
                      <li>Create InfluxDB database: <code>influx -execute "CREATE DATABASE k6"</code></li>
                      <li>Add InfluxDB data source in Grafana: <code>http://localhost:8086</code>, database: <code>k6</code></li>
                      <li>Import dashboard with ID: <strong>2587</strong></li>
                      <li>Run K6 with the commands above</li>
                      <li>Watch real-time metrics in Grafana! 🎉</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {generatedScript && showTestCases && (
          <div className="test-cases-visualization">
            <h3>📋 All Test Case Combinations</h3>
            
            {/* Test Case Statistics */}
            <div className="test-cases-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{testCases.length}</div>
                  <div className="stat-label">Total Test Cases</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{testCases.filter(tc => tc.inputs && Object.keys(tc.inputs).length > 0).length}</div>
                  <div className="stat-label">With Dynamic Inputs</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{testCases.filter(tc => !tc.inputs || Object.keys(tc.inputs).length === 0).length}</div>
                  <div className="stat-label">Static Flows</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{getUniqueEndNodes().length}</div>
                  <div className="stat-label">Unique End Points</div>
                </div>
              </div>
              
              {/* K6 Script Coverage Analysis */}
              <div className="coverage-analysis">
                <h4>📊 K6 Script Coverage Analysis</h4>
                <div className="coverage-details">
                  {analyzeK6Coverage()}
                </div>
              </div>
            </div>
            
            <div className="test-cases-grid">
              {testCases.map((testCase, index) => (
                <div key={index} className="test-case-card">
                  <div className="test-case-header">
                    <h4>{testCase.pathName}</h4>
                    {testCase.inputs && Object.keys(testCase.inputs).length > 0 && (
                      <div className="test-case-inputs">
                        <strong>Inputs: </strong>
                        {Object.entries(testCase.inputs).map(([attr, value]) => (
                          <span key={attr} className="input-tag">
                            {attr}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="test-case-flow">
                    <strong>Flow Steps (Input → Expected Response):</strong>
                    <div className="flow-steps">
                      {testCase.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flow-step">
                          <div className="step-interaction">
                            <div className="user-input">
                              <span className="step-type">{step.nodeType}</span>
                              <span className="input-text">User Input: {step.input}</span>
                              {step.storeAttribute && (
                                <span className="store-attr">({step.storeAttribute})</span>
                              )}
                            </div>
                            <div className="arrow">→</div>
                            <div className="expected-response">
                              <span className="response-text">Expected: {step.expectedResponse || 'No response defined'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="test-case-summary">
                    <strong>Summary:</strong>
                    <div className="summary-text">{testCase.description}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {testCases.length === 0 && (
              <div className="no-test-cases">
                <p>No test cases generated. Please check your flow configuration.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default K6TestGenerator;

// Add styles for test cases visualization
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .test-cases-visualization {
    margin-top: 20px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .test-cases-stats {
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .stat-card {
    text-align: center;
    padding: 12px;
    background: #f1f5f9;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
  }

  .stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #1e40af;
    line-height: 1;
  }

  .stat-label {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }

  .coverage-analysis {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }

  .coverage-analysis h4 {
    margin: 0 0 12px 0;
    color: #374151;
    font-size: 16px;
  }

  .coverage-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .coverage-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 6px;
  }

  .coverage-item.warning {
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
  }

  .coverage-status {
    font-size: 16px;
    min-width: 20px;
  }

  .coverage-status.good {
    color: #22c55e;
  }

  .coverage-status.warning {
    color: #f59e0b;
  }

  .coverage-status.error {
    color: #ef4444;
  }

  .coverage-text {
    flex: 1;
    font-size: 13px;
    color: #374151;
  }

  .coverage-recommendation {
    margin-top: 12px;
    padding: 12px;
    background: #fef3c7;
    border-radius: 6px;
    border-left: 3px solid #f59e0b;
  }

  .coverage-recommendation h5 {
    margin: 0 0 8px 0;
    color: #92400e;
    font-size: 14px;
  }

  .coverage-recommendation ul {
    margin: 0;
    padding-left: 16px;
    color: #92400e;
    font-size: 12px;
  }

  .coverage-recommendation li {
    margin-bottom: 4px;
  }

  .coverage-success {
    margin-top: 12px;
    padding: 12px;
    background: #dcfce7;
    border-radius: 6px;
    border-left: 3px solid #22c55e;
  }

  .coverage-success h5 {
    margin: 0 0 8px 0;
    color: #166534;
    font-size: 14px;
  }

  .coverage-success p {
    margin: 0;
    color: #166534;
    font-size: 12px;
    line-height: 1.4;
  }

  .test-cases-visualization h3 {
    color: #1e293b;
    margin-bottom: 16px;
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .test-cases-info {
    background: #dbeafe;
    color: #1e40af;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 500;
  }

  .test-cases-grid {
    display: grid;
    gap: 16px;
    max-height: 500px;
    overflow-y: auto;
  }

  .test-case-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .test-case-header {
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
  }

  .test-case-header h4 {
    color: #374151;
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .test-case-inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    font-size: 13px;
  }

  .input-tag {
    background: #f0f9ff;
    color: #0c4a6e;
    padding: 2px 8px;
    border-radius: 12px;
    border: 1px solid #7dd3fc;
    font-weight: 500;
    font-size: 12px;
  }

  .test-case-flow {
    margin-bottom: 12px;
  }

  .test-case-flow strong {
    color: #374151;
    font-size: 14px;
    margin-bottom: 8px;
    display: block;
  }

  .flow-steps {
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px;
  }

  .flow-step {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .flow-step:last-child {
    border-bottom: none;
  }

  .step-interaction {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 12px;
  }

  .user-input {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f0f9ff;
    padding: 6px 10px;
    border-radius: 6px;
    border-left: 3px solid #0ea5e9;
  }

  .expected-response {
    flex: 2;
    background: #f0fdf4;
    padding: 6px 10px;
    border-radius: 6px;
    border-left: 3px solid #22c55e;
  }

  .arrow {
    color: #6b7280;
    font-weight: bold;
    font-size: 16px;
  }

  .input-text {
    color: #0c4a6e;
    font-weight: 500;
    font-size: 13px;
  }

  .response-text {
    color: #166534;
    font-weight: 500;
    font-size: 13px;
  }

  .store-attr {
    background: #fbbf24;
    color: #92400e;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 10px;
  }

  .step-type {
    background: #e0e7ff;
    color: #3730a3;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 11px;
    min-width: 60px;
    text-align: center;
  }

  .step-text {
    flex: 1;
    color: #374151;
    font-weight: 500;
  }

  .step-input {
    background: #fef3c7;
    color: #92400e;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 11px;
  }

  .test-case-summary {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #f1f5f9;
  }

  .test-case-summary strong {
    color: #374151;
    font-size: 14px;
    margin-bottom: 6px;
    display: block;
  }

  .summary-text {
    background: #f8fafc;
    color: #475569;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.4;
    border-left: 3px solid #06b6d4;
  }

  .no-test-cases {
    text-align: center;
    padding: 40px;
    color: #64748b;
    font-style: italic;
  }

  .view-cases-btn {
    background: #059669;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .view-cases-btn:hover {
    background: #047857;
  }

  .script-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* InfluxDB Commands Section */
  .influxdb-commands {
    margin-top: 20px;
    padding: 20px;
    background: #f0f9ff;
    border-radius: 8px;
    border-left: 4px solid #0ea5e9;
  }

  .influxdb-commands h4 {
    color: #0c4a6e;
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .command-section {
    margin-bottom: 20px;
  }

  .command-section h5 {
    color: #374151;
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .command-box {
    position: relative;
    background: #1e293b;
    color: #f8fafc;
    padding: 12px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.4;
    overflow-x: auto;
    border: 1px solid #334155;
  }

  .command-box code {
    background: none;
    color: inherit;
    padding: 0;
    white-space: pre;
  }

  .copy-command-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #475569;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .copy-command-btn:hover {
    background: #64748b;
  }

  .setup-links {
    border-top: 1px solid #bae6fd;
    padding-top: 16px;
    margin-top: 20px;
  }

  .setup-links h5 {
    color: #0c4a6e;
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .setup-link-btn {
    background: #0ea5e9;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-right: 12px;
    margin-bottom: 12px;
    transition: background-color 0.2s;
    text-decoration: none;
    display: inline-block;
  }

  .setup-link-btn:hover {
    background: #0284c7;
  }

  .setup-steps {
    background: #fefce8;
    padding: 16px;
    border-radius: 6px;
    border-left: 3px solid #facc15;
    margin-top: 12px;
  }

  .setup-steps p {
    margin: 0 0 8px 0;
    color: #854d0e;
    font-weight: 600;
    font-size: 14px;
  }

  .setup-steps ol {
    margin: 8px 0 0 0;
    padding-left: 20px;
    color: #713f12;
  }

  .setup-steps li {
    margin-bottom: 4px;
    font-size: 13px;
    line-height: 1.4;
  }

  .setup-steps code {
    background: #fef3c7;
    color: #92400e;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  /* TPS Configuration Styles */
  .test-mode-selection {
    margin-bottom: 24px;
  }

  .mode-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 12px;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .mode-btn:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .mode-btn.active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .mode-icon {
    font-size: 24px;
    min-width: 32px;
  }

  .mode-info h4 {
    margin: 0 0 4px 0;
    color: #1f2937;
    font-size: 14px;
  }

  .mode-info p {
    margin: 0;
    color: #6b7280;
    font-size: 12px;
  }

  .tps-configuration {
    margin-top: 20px;
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .tps-presets h4,
  .custom-tps-config h4,
  .advanced-tps-config h4,
  .tps-analysis h4 {
    margin: 0 0 16px 0;
    color: #1f2937;
    font-size: 16px;
  }

  .tps-preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .tps-preset-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tps-preset-card:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  .tps-preset-card.selected {
    border-color: currentColor;
    background: #f0f9ff;
  }

  .tps-preset-icon {
    font-size: 20px;
    min-width: 24px;
  }

  .tps-preset-info h5 {
    margin: 0 0 4px 0;
    color: #1f2937;
    font-size: 13px;
  }

  .tps-preset-stats {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #4b5563;
  }

  .tps-preset-stats span {
    background: #e5e7eb;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .custom-tps-config,
  .advanced-tps-config {
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .tps-config-grid {
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
    color: #6b7280;
    font-size: 12px;
    display: block;
  }

  .config-field input,
  .config-field select {
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
  }

  .config-field input:focus,
  .config-field select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .tps-analysis {
    padding: 16px;
    background: #f0fdf4;
    border-radius: 6px;
    border: 1px solid #bbf7d0;
  }

  .tps-analysis-grid {
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
    color: #6b7280;
  }

  .warning {
    color: #f59e0b;
    font-size: 12px;
    font-weight: bold;
    margin-top: 4px;
  }

  .warning-message {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 4px;
    padding: 12px;
    color: #92400e;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .formula-explanation {
    background: white;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #d1d5db;
  }

  .formula-explanation h5 {
    margin: 0 0 12px 0;
    color: #1f2937;
    font-size: 14px;
  }

  .formula-box {
    background: #1f2937;
    color: #f9fafb;
    padding: 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    margin-bottom: 12px;
    font-size: 13px;
  }

  .formula-example {
    color: #4b5563;
    font-size: 14px;
  }
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}
