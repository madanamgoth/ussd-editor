import React, { useState } from 'react';
import { exportToFlowFormat } from '../utils/flowUtils';

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

  // Generate all possible test case combinations
  const generateAllTestCases = () => {
    try {
      // Use the same data structure that was used for the K6 script
      const exportedNodes = exportToFlowFormat(nodes, edges);
      const actualStoreAttributes = extractStoreAttributesFromFlow(nodes);
      const flowData = {
        nodes: exportedNodes,
        edges: edges,
        storeAttributes: actualStoreAttributes
      };
      
      console.log('Flow data for test cases:', flowData);
      
      // Find START nodes and get all paths (same logic as K6 script generation)
      const startNodes = flowData.nodes.filter(node => 
        node.type && node.type.toLowerCase() === 'start'
      );
      
      if (startNodes.length === 0) {
        console.log('No START nodes found for test case generation');
        setTestCases([]);
        return [];
      }
      
      const allCombinations = [];
      
      startNodes.forEach((startNode, startIndex) => {
        const paths = findFlowPaths(startNode, flowData.nodes);
        console.log(`Found ${paths.length} paths for START node ${startNode.id}`);
        
        paths.forEach((path, pathIndex) => {
          console.log(`Path ${pathIndex + 1} structure:`, path);
          
          // Convert path to inputs and metadata (same as K6 script generation)
          const inputsWithMetadata = extractInputsFromPath(path);
          const inputs = inputsWithMetadata.map(item => item.input);
          const startInput = config.dialCode || Object.keys(startNode.transitions || {})[0] || 'default';
          
          console.log(`Path ${pathIndex + 1} inputs:`, inputs);
          console.log(`Path ${pathIndex + 1} inputMetadata:`, inputsWithMetadata);
          
          // Extract inputs with storeAttribute from the path
          const pathInputsWithStoreAttributes = [];
          
          if (inputsWithMetadata) {
            inputsWithMetadata.forEach(meta => {
              if (meta.storeAttribute && meta.input === '*') {
                pathInputsWithStoreAttributes.push({
                  storeAttribute: meta.storeAttribute,
                  nodeType: meta.nodeType
                });
              }
            });
          }

          if (pathInputsWithStoreAttributes.length === 0) {
            // Path with no dynamic inputs - show the static flow
            allCombinations.push({
              pathId: pathIndex + 1,
              pathName: `Flow_${startNode.id}_Path_${pathIndex + 1}`,
              steps: createStepsFromInputs(inputs, inputsWithMetadata),
              inputs: {},
              description: createFlowDescription(inputs, inputsWithMetadata, {})
            });
          } else {
            // Generate combinations for paths with dynamic inputs
            const inputCombinations = generateInputCombinationsFromK6Data(pathInputsWithStoreAttributes);
            
            inputCombinations.forEach((combination, combIndex) => {
              allCombinations.push({
                pathId: pathIndex + 1,
                combinationId: combIndex + 1,
                pathName: `Flow_${startNode.id}_Path_${pathIndex + 1} - Combination ${combIndex + 1}`,
                steps: createStepsFromInputs(inputs, inputsWithMetadata, combination),
                inputs: combination,
                description: createFlowDescription(inputs, inputsWithMetadata, combination)
              });
            });
          }
        });
      });

      console.log('Generated test cases:', allCombinations);
      setTestCases(allCombinations);
      return allCombinations;
    } catch (error) {
      console.error('Error generating test cases:', error);
      setTestCases([]);
      return [];
    }
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

  // Analyze K6 script coverage
  const analyzeK6Coverage = () => {
    if (!generatedScript || testCases.length === 0) {
      return <div className="coverage-item warning">⚠️ Cannot analyze coverage - missing data</div>;
    }

    // Extract scenarios from generated script
    const scenarioMatches = generatedScript.match(/const FLOW_SCENARIOS = \[([\s\S]*?)\];/);
    let k6ScenariosCount = 0;
    
    if (scenarioMatches) {
      try {
        // Count actual scenarios in the script
        const scenariosText = scenarioMatches[1];
        const scenarioBlocks = scenariosText.split(/\{\s*"name"/).length - 1; // Count scenario objects
        k6ScenariosCount = scenarioBlocks;
      } catch (error) {
        console.error('Error parsing K6 scenarios:', error);
        // Fallback: count by looking for scenario names
        const nameMatches = generatedScript.match(/"name":\s*"Flow_[^"]+"/g);
        k6ScenariosCount = nameMatches ? nameMatches.length : 0;
      }
    }

    const maxPossibleTestCases = 66; // Correct maximum based on your flow analysis
    const actualTestCases = testCases.length;
    
    const coverage = {
      testCasesTotal: actualTestCases,
      maxPossible: maxPossibleTestCases,
      k6ScenariosTotal: k6ScenariosCount,
      testCaseCoverage: Math.round((actualTestCases / maxPossibleTestCases) * 100),
      k6Coverage: k6ScenariosCount > 0 ? Math.round((k6ScenariosCount / maxPossibleTestCases) * 100) : 0
    };

    // Dynamic input coverage
    const testCasesWithDynamicInputs = testCases.filter(tc => tc.inputs && Object.keys(tc.inputs).length > 0);
    const dynamicInputCombinations = testCasesWithDynamicInputs.length;
    
    // Check if K6 script has dynamic input handling
    const hasDynamicInputs = generatedScript.includes('attributeConfigs') && 
                            generatedScript.includes('processFlowInput');

    return (
      <div className="coverage-results">
        <div className="coverage-item">
          <span className={`coverage-status ${coverage.testCaseCoverage >= 95 ? 'good' : coverage.testCaseCoverage >= 80 ? 'warning' : 'error'}`}>
            {coverage.testCaseCoverage >= 95 ? '✅' : coverage.testCaseCoverage >= 80 ? '⚠️' : '❌'}
          </span>
          <div className="coverage-text">
            <strong>Test Case Discovery:</strong> {coverage.testCasesTotal} of {coverage.maxPossible} possible combinations ({coverage.testCaseCoverage}%)
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
          <span className={`coverage-status ${hasDynamicInputs ? 'good' : 'error'}`}>
            {hasDynamicInputs ? '✅' : '❌'}
          </span>
          <div className="coverage-text">
            <strong>Dynamic Input Support:</strong> {hasDynamicInputs ? 'Enabled' : 'Missing'} 
            {dynamicInputCombinations > 0 && ` (${dynamicInputCombinations} combinations)`}
          </div>
        </div>
        
        <div className="coverage-item">
          <span className={`coverage-status ${generatedScript.includes('storeAttribute') ? 'good' : 'warning'}`}>
            {generatedScript.includes('storeAttribute') ? '✅' : '⚠️'}
          </span>
          <div className="coverage-text">
            <strong>Store Attributes:</strong> {generatedScript.includes('storeAttribute') ? 'Detected' : 'Limited'} 
            (PIN, AMOUNT, RCMSISDN)
          </div>
        </div>
        
        <div className="coverage-item">
          <span className={`coverage-status ${getUniqueEndNodes().length > 1 ? 'good' : 'warning'}`}>
            {getUniqueEndNodes().length > 1 ? '✅' : '⚠️'}
          </span>
          <div className="coverage-text">
            <strong>End Point Coverage:</strong> {getUniqueEndNodes().length} unique outcomes tested
          </div>
        </div>

        {(coverage.testCaseCoverage < 95 || coverage.k6Coverage < 95) && (
          <div className="coverage-recommendation">
            <h5>💡 Recommendations:</h5>
            <ul>
              {coverage.testCaseCoverage < 95 && (
                <li>Test case generation found {coverage.testCasesTotal}/66 possible combinations - some paths may be unreachable</li>
              )}
              {coverage.k6Coverage < 80 && (
                <li>K6 script covers only {coverage.k6ScenariosTotal} scenarios - consider generating more comprehensive test scenarios</li>
              )}
              {!hasDynamicInputs && (
                <li>Enable dynamic input generation to test all PIN/AMOUNT/RCMSISDN combinations</li>
              )}
              {getUniqueEndNodes().length <= 1 && (
                <li>Verify all possible end scenarios (success, failures, exits) are reachable</li>
              )}
              {coverage.k6Coverage >= 80 && coverage.k6Coverage < 95 && (
                <li>Good coverage! Consider adding edge cases and error scenarios for comprehensive testing</li>
              )}
            </ul>
          </div>
        )}

        {coverage.testCaseCoverage >= 95 && coverage.k6Coverage >= 95 && (
          <div className="coverage-success">
            <h5>🎉 Excellent Coverage!</h5>
            <p>Your test setup covers {coverage.testCaseCoverage}% of possible flows with comprehensive K6 scenarios. This should provide thorough load testing coverage.</p>
          </div>
        )}
      </div>
    );
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
      // Import the flow utils to export the current flow
      const exportedNodes = exportToFlowFormat(nodes, edges);
      console.log('Exported nodes:', exportedNodes);
      console.log('Original nodes:', nodes);
      console.log('Original edges:', edges);
      
      // Extract actual storeAttributes from the flow
      const actualStoreAttributes = extractStoreAttributesFromFlow(nodes);
      console.log('Actual storeAttributes found in flow:', actualStoreAttributes);
      
      // Create flow data object with nodes array
      const flowData = {
        nodes: exportedNodes,
        edges: edges,
        storeAttributes: actualStoreAttributes
      };
      
      console.log('Flow data for K6:', flowData);
      
      // Generate K6 script based on the flow
      const script = createK6Script(flowData, config);
      
      setGeneratedScript(script);
      
      // Also generate test cases for visualization
      generateAllTestCases();
    } catch (error) {
      console.error('Error generating K6 script:', error);
      alert('Error generating K6 script. Please check your flow configuration.');
    } finally {
      setIsGenerating(false);
    }
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
      // For non-ACTION nodes, validate against expected content
      checks['contains expected content'] = (r) => {
        const responseBody = r.body.trim();
        const expected = expectedResponse.trim();
        
        let contentMatch = false;
        
        // Try exact match first
        if (responseBody.includes(expected)) {
          contentMatch = true;
        }
        // Try case-insensitive match
        else if (responseBody.toLowerCase().includes(expected.toLowerCase())) {
          contentMatch = true;
        }
        // For menu responses, check if response contains menu structure
        else if (expected.includes('\\n') && (expected.includes('1.') || expected.includes('2.'))) {
          const menuOptions = expected.split('\\n').filter(line => line.trim().match(/^\\d+\\./));
          const bodyLower = responseBody.toLowerCase();
          const foundOptions = menuOptions.filter(option => 
            bodyLower.includes(option.toLowerCase().substring(0, 10))
          );
          contentMatch = foundOptions.length >= Math.floor(menuOptions.length / 2);
        }
        // Try partial match for key phrases
        else {
          const keyWords = expected.toLowerCase()
            .replace(/[^\\w\\s]/g, ' ')
            .split(/\\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['please', 'enter', 'your', 'the', 'and', 'for', 'with', 'thank', 'using'].includes(word));
            
          if (keyWords.length > 0) {
            const bodyLower = responseBody.toLowerCase();
            const matchedWords = keyWords.filter(word => bodyLower.includes(word));
            contentMatch = matchedWords.length >= Math.ceil(keyWords.length / 2);
          }
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
    
    sleep(1 + Math.random() * 2);
    
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
      
      sleep(0.5 + Math.random() * 1.5);
    }
    
    if (!flowCompleted && stepCount > 0) {
      businessMetrics.failed_transactions.add(1, { ...sessionTags, failure_step: stepCount });
    }
    
    flowCompletionRate.add(flowCompleted ? 1 : 0, sessionTags);
    sessionDuration.add(Date.now() - sessionStart, sessionTags);
    
    // Start new session after completion
    if (flowCompleted) {
      sleep(2 + Math.random() * 3);
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
  
  sleep(2 + Math.random() * 3);
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
`;

if (!document.head.contains(styleSheet)) {
  document.head.appendChild(styleSheet);
}
