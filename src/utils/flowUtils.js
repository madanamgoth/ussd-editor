// Utility functions for USSD flow management
import { MarkerType } from '@xyflow/react';

export const generateNodeId = (type) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${type}_${timestamp}_${random}`;
};

export const createNodeData = (type, position = { x: 0, y: 0 }) => {
  const baseConfig = {
    prompts: {
      en: '',
      es: '',
      fr: '',
      ar: ''
    },
    transitions: {},
    fallback: '',
    defaultLanguage: 'en'
  };

  const nodeConfigs = {
    start: {
      ...baseConfig,
      prompts: {
        en: 'Welcome to our service',
        es: 'Bienvenido a nuestro servicio',
        fr: 'Bienvenue dans notre service',
        ar: 'مرحباً بكم في خدمتنا'
      },
      transitions: { '': '' }
    },
    menu: {
      ...baseConfig,
      prompts: {
        en: '1. Send Money\n2. Check Balance\n3. Pay Bills\n4. Account Info',
        es: '1. Enviar Dinero\n2. Consultar Saldo\n3. Pagar Facturas\n4. Info de Cuenta',
        fr: '1. Envoyer de l\'Argent\n2. Vérifier le Solde\n3. Payer les Factures\n4. Info Compte',
        ar: '1. إرسال الأموال\n2. فحص الرصيد\n3. دفع الفواتير\n4. معلومات الحساب'
      },
      transitions: { '1': '', '2': '', '3': '', '4': '' }
    },
    'dynamic-menu': {
      ...baseConfig,
      prompts: {
        en: 'Please select an option:',
        es: 'Por favor seleccione una opción:',
        fr: 'Veuillez sélectionner une option:',
        ar: 'يرجى اختيار خيار:'
      },
      dataSource: {
        type: 'session', // 'session' or 'api'
        sessionVariable: '', // Variable name from previous Action node
        responseKey: 'data', // Path to array in session data (supports nested: 'result.items', 'response.data.billers')
        nameField: 'name', // Field for display text (supports nested: 'details.name', 'info.title')
        idField: 'id', // Field for unique identifier (supports nested: 'details.id', 'code')
        // Optional filters and transformations
        filterField: '', // Optional: field to filter items (e.g., 'status')
        filterValue: '', // Optional: value to filter by (e.g., 'active')
        sortBy: '', // Optional: field to sort by
        sortOrder: 'asc' // 'asc' or 'desc'
      },
      // Keep API config for backward compatibility
      apiConfig: {
        endpoint: '',
        method: 'GET',
        headers: {},
        responseKey: 'data',
        nameField: 'name',
        idField: 'id'
      },
      menuMapping: {},
      // Dynamic routing strategies
      routingStrategy: {
        type: 'conditional', // 'fixed', 'conditional', 'single'
        // For 'fixed': predefined mapping for each option number
        fixedMapping: {
          '1': '',
          '2': '',
          '3': ''
        },
        // For 'conditional': route based on item properties
        conditionalRules: [
          {
            condition: 'item.type === "mobile_money"',
            targetNode: ''
          },
          {
            condition: 'item.type === "utility"', 
            targetNode: ''
          }
        ],
        // For 'single': all options go to same next node
        singleTarget: '',
        // Default fallback for unmatched conditions
        defaultTarget: ''
      },
      maxMenuItems: 10,
      fallback: '',
      transitions: {}
    },
    input: {
      ...baseConfig,
      prompts: {
        en: 'Please enter your input:',
        es: 'Por favor ingrese su información:',
        fr: 'Veuillez saisir votre entrée:',
        ar: 'يرجى إدخال بياناتك:'
      },
      variableName: '',
      matchPattern: '*',
      transitions: { '*': '' }
    },
    action: {
      ...baseConfig,
      prompts: { en: '', es: '', fr: '', ar: '' },
      templates: [
        { id: 'send_money_template', name: 'Send Money API' },
        { id: 'check_balance_template', name: 'Check Balance API' }
      ],
      transactionCodes: ['200', '400', '500'],
      transitions: { '200': '', '400': '', '500': '' }
    },
    end: {
      ...baseConfig,
      prompts: {
        en: 'Thank you for using our service!',
        es: '¡Gracias por usar nuestro servicio!',
        fr: 'Merci d\'utiliser notre service!',
        ar: 'شكراً لاستخدام خدمتنا!'
      },
      transitions: {}
    }
  };

  const id = generateNodeId(type);
  
  const nodeData = {
    id,
    type,
    position,
    data: {
      id, // Add id to data as well for node components
      label: type.charAt(0).toUpperCase() + type.slice(1),
      type: type.toUpperCase(),
      config: nodeConfigs[type]
    },
    measured: getNodeDimensions(type),
    selected: false,
    dragging: false
  };
  
  return nodeData;
};

export const getNodeDimensions = (type) => {
  const dimensions = {
    start: { width: 200, height: 120 },
    menu: { width: 220, height: 200 },
    'dynamic-menu': { width: 250, height: 220 },
    input: { width: 200, height: 150 },
    action: { width: 200, height: 140 },
    end: { width: 180, height: 100 }
  };
  
  return dimensions[type] || { width: 150, height: 100 };
};

export const createEdge = (source, target, sourceHandle = null, animated = true, label = null) => {
  const colors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#84cc16', '#f97316', '#ec4899', '#64748b', '#dc2626',
    '#059669', '#7c3aed', '#0891b2', '#65a30d'
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  const edgeId = sourceHandle 
    ? `xy-edge__${source}${sourceHandle}-${target}`
    : `xy-edge__${source}-${target}`;

  // Generate meaningful label based on sourceHandle
  let edgeLabel = label;
  if (!edgeLabel && sourceHandle) {
    if (sourceHandle.startsWith('transaction-')) {
      const code = sourceHandle.replace('transaction-', '');
      edgeLabel = `${code === '200' ? '✅' : code === '400' ? '⚠️' : '❌'} ${code}`;
    } else if (sourceHandle.startsWith('option-')) {
      const option = sourceHandle.replace('option-', '');
      edgeLabel = `📋 Option ${option}`;
    } else if (sourceHandle === 'fallback') {
      edgeLabel = '🔄 Fallback';
    } else if (sourceHandle === 'input') {
      edgeLabel = '📝 Input';
    } else {
      edgeLabel = sourceHandle;
    }
  } else if (!edgeLabel) {
    edgeLabel = '➡️ Next';
  }

  const edgeConfig = {
    id: edgeId,
    source,
    target,
    sourceHandle,
    type: 'smoothstep', // Use smoothstep with custom label positioning
    animated,
    label: edgeLabel,
    labelPosition: 0.8, // Position label at 80% of the edge length
    labelShowBg: true,
    labelBgPadding: [4, 8],
    labelBgBorderRadius: 4,
    labelStyle: {
      fill: color,
      fontWeight: 600,
      fontSize: '12px',
    },
    labelBgStyle: {
      fill: 'white',
      fillOpacity: 0.9,
      stroke: color,
      strokeWidth: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color
    },
    style: {
      strokeWidth: 3,
      stroke: color,
      cursor: 'pointer'
    },
    // Add properties for better clickability
    interactionWidth: 20, // Makes the edge easier to click
    focusable: true,
    selectable: true,
    deletable: true
  };
  
  console.log('🔗 Creating edge with label positioning:', edgeConfig);
  return edgeConfig;
};

export const exportToFlowFormat = (nodes, edges) => {
  // Sort nodes to put START nodes first, then others in logical order
  const sortedNodes = [...nodes].sort((a, b) => {
    const typeOrder = {
      'start': 0,
      'menu': 1,
      'input': 2,
      'action': 3,
      'end': 4
    };
    
    const aType = a.data.type?.toLowerCase() || 'unknown';
    const bType = b.data.type?.toLowerCase() || 'unknown';
    
    const aOrder = typeOrder[aType] ?? 5;
    const bOrder = typeOrder[bType] ?? 5;
    
    return aOrder - bOrder;
  });
  
  // Create a map for quick node lookup
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  // Helper function to get next node metadata
  const getNextNodeMetadata = (currentNodeId, targetNodeId) => {
    const targetNode = nodeMap.get(targetNodeId);
    if (!targetNode) return null;
    
    return {
      nextNodeType: targetNode.data.type,
      nextNodePrompts: targetNode.data.config?.prompts || {},
      nextNodeStoreAttribute: targetNode.data.config?.storeAttribute || targetNode.data.config?.variableName || null,
      nextNodeTemplateId: targetNode.data.config?.templateId || null
    };
  };
  
  return sortedNodes.map(node => {
    const nodeType = node.data.type;
    const config = node.data.config;
    
    // Build transitions from both config.transitions AND actual visual edges
    let cleanTransitions = {};
    let nextNodeMetadata = {}; // Store metadata for each transition
    
    // First, get transitions from visual edges (this captures the actual graph connections)
    if (edges) {
      const nodeEdges = edges.filter(edge => edge.source === node.id);
      nodeEdges.forEach(edge => {
        if (edge.target && edge.target.trim() !== '') {
          const sourceHandle = edge.sourceHandle || '';
          const metadata = getNextNodeMetadata(node.id, edge.target);
          
          if (nodeType === 'INPUT') {
            // For INPUT nodes, use '*' for any connection
            cleanTransitions['*'] = edge.target;
            if (metadata) {
              nextNodeMetadata['*'] = metadata;
            }
          } else if (nodeType === 'ACTION') {
            // For ACTION nodes, clean up transaction codes
            let cleanKey = sourceHandle;
            if (sourceHandle.startsWith('transaction-')) {
              cleanKey = sourceHandle.replace('transaction-', '');
            }
            if (['200', '400', '500', 'onSuccess', 'onError', 'onBadRequest'].includes(cleanKey)) {
              cleanTransitions[cleanKey] = edge.target;
              if (metadata) {
                nextNodeMetadata[cleanKey] = metadata;
              }
            }
          } else if (nodeType === 'MENU') {
            // For MENU nodes, clean up option handles
            if (sourceHandle.startsWith('option-')) {
              const optionNumber = sourceHandle.replace('option-', '');
              cleanTransitions[optionNumber] = edge.target;
              if (metadata) {
                nextNodeMetadata[optionNumber] = metadata;
              }
            } else if (sourceHandle === 'fallback') {
              cleanTransitions['fallback'] = edge.target;
              if (metadata) {
                nextNodeMetadata['fallback'] = metadata;
              }
            } else if (sourceHandle === '*') {
              cleanTransitions['*'] = edge.target;
              if (metadata) {
                nextNodeMetadata['*'] = metadata;
              }
            }
          } else if (nodeType === 'DYNAMIC-MENU') {
            // For DYNAMIC-MENU nodes, handle simplified connections
            if (sourceHandle === 'dynamic-output') {
              // Main dynamic output - runtime routing handled by routing strategy
              cleanTransitions['*'] = edge.target;
              if (metadata) {
                nextNodeMetadata['*'] = metadata;
              }
            } else if (sourceHandle === 'fallback') {
              cleanTransitions['fallback'] = edge.target;
              if (metadata) {
                nextNodeMetadata['fallback'] = metadata;
              }
            }
          } else if (nodeType === 'START') {
            // For START nodes, use configured USSD code or empty string like previous version
            let key = sourceHandle || '';
            
            // If node has configured USSD code, use it as the key
            if (node.data.config?.ussdCode && node.data.config.ussdCode.trim() !== '') {
              key = node.data.config.ussdCode.trim();
            } else {
              // Default to empty string for START nodes (previous version behavior)
              key = '';
            }
            
            cleanTransitions[key] = edge.target;
            if (metadata) {
              nextNodeMetadata[key] = metadata;
            }
          }
        }
      });
    }
    
    // Then, merge with any manually configured transitions (from config panel)
    if (config.transitions) {
      Object.entries(config.transitions).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          if (nodeType === 'MENU') {
            // For MENU nodes, prefer the cleaned key format
            const cleanKey = key.startsWith('option-') ? key.replace('option-', '') : key;
            if (/^\d+$/.test(cleanKey) || cleanKey === 'fallback' || cleanKey === '*') {
              cleanTransitions[cleanKey] = value;
              // Get metadata for manually configured transitions
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[cleanKey] = metadata;
              }
            }
          } else if (nodeType === 'DYNAMIC-MENU') {
            // For DYNAMIC-MENU nodes, only allow '*' (main output) and 'fallback'
            if (key === '*' || key === 'fallback') {
              cleanTransitions[key] = value;
              // Get metadata for manually configured transitions
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[key] = metadata;
              }
            }
          } else if (nodeType === 'ACTION') {
            // For ACTION nodes, prefer cleaned transaction codes
            const cleanKey = key.startsWith('transaction-') ? key.replace('transaction-', '') : key;
            if (['200', '400', '500', 'onSuccess', 'onError', 'onBadRequest'].includes(cleanKey)) {
              cleanTransitions[cleanKey] = value;
              // Get metadata for manually configured transitions
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[cleanKey] = metadata;
              }
            }
          } else if (nodeType === 'INPUT') {
            // For INPUT nodes, allow '*' and other meaningful keys
            if (key === '*' || (key && key.trim() !== '')) {
              cleanTransitions[key] = value;
              // Get metadata for manually configured transitions
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[key] = metadata;
              }
            }
          } else {
            // For other node types, use as-is if not already set by edges
            if (!cleanTransitions[key] && key && key.trim() !== '') {
              cleanTransitions[key] = value;
              // Get metadata for manually configured transitions
              const metadata = getNextNodeMetadata(node.id, value);
              if (metadata) {
                nextNodeMetadata[key] = metadata;
              }
            }
          }
        }
      });
    }

    // Build the clean node object - EXACTLY as previous version
    const cleanNode = {
      id: node.id,
      type: nodeType,
      transitions: cleanTransitions
    };

    // Add next node metadata based on node type and expected format
    const transitionKeys = Object.keys(cleanTransitions);
    
    // Determine format based on node type - not transition count
    // START and INPUT nodes use direct nextNodeType/nextNodePrompts format
    // MENU, ACTION, DYNAMIC-MENU nodes ALWAYS use nextNodesMetadata format (even with single transitions)
    // END nodes have no next node metadata
    if ((nodeType === 'START' || nodeType === 'INPUT') && transitionKeys.length > 0) {
      // Use direct format for START and INPUT nodes (single target semantics)
      const primaryKey = transitionKeys[0]; // Take first transition as primary
      const metadata = nextNodeMetadata[primaryKey];
      if (metadata) {
        cleanNode.nextNodeType = metadata.nextNodeType;
        cleanNode.nextNodePrompts = metadata.nextNodePrompts;
        if (metadata.nextNodeStoreAttribute) {
          cleanNode.nextNodeStoreAttribute = metadata.nextNodeStoreAttribute;
        }
        if (metadata.nextNodeTemplateId) {
          cleanNode.nextNodeTemplateId = metadata.nextNodeTemplateId;
        }
      }
    } else if ((nodeType === 'MENU' || nodeType === 'ACTION' || nodeType === 'DYNAMIC-MENU') && transitionKeys.length > 0) {
      // Use nextNodesMetadata format for MENU, ACTION, DYNAMIC-MENU nodes (ALWAYS, even with single transitions)
      cleanNode.nextNodesMetadata = {};
      transitionKeys.forEach(key => {
        if (nextNodeMetadata[key]) {
          cleanNode.nextNodesMetadata[key] = nextNodeMetadata[key];
        }
      });
    }

    // Add optional fields only if they have meaningful values
    if (config.storeAttribute && config.storeAttribute.trim() !== '') {
      cleanNode.storeAttribute = config.storeAttribute;
    }
    
    if (config.variableName && config.variableName.trim() !== '') {
      cleanNode.storeAttribute = config.variableName; // Use variableName as storeAttribute for compatibility
    }
    
    if (config.templateId && config.templateId.trim() !== '') {
      cleanNode.templateId = config.templateId;
    }
    
    // For ACTION nodes, extract templateId from the first template
    if (nodeType === 'ACTION' && config.templates && config.templates.length > 0) {
      const firstTemplate = config.templates[0];
      if (firstTemplate._id && firstTemplate._id.trim() !== '') {
        cleanNode.templateId = firstTemplate._id;
      }
    }
    
    // Add dynamic menu fields if they exist (for ACTION nodes)
    if (nodeType === 'ACTION') {
      if (config.templateId) {
        cleanNode.templateId = config.templateId;
      }
      if (config.sessionSpec) {
        cleanNode.sessionSpec = config.sessionSpec;
      }
      if (config.menuName) {
        cleanNode.menuName = config.menuName;
      }
      if (config.menuJolt) {
        cleanNode.menuJolt = config.menuJolt;
      }
      if (config.isNextMenuDynamic) {
        cleanNode.isNextMenuDynamic = config.isNextMenuDynamic;
      }
    }
    
    if (config.fallback && config.fallback.trim() !== '' && nodeType !== 'MENU') {
      // For MENU nodes, fallback is already in transitions (previous version behavior)
      cleanNode.fallback = config.fallback;
    }

    return cleanNode;
  });
};

export const importFromFlowFormat = (flowData) => {
  return flowData.map((flowNode, index) => {
    const position = {
      x: 100 + (index % 3) * 250,
      y: 100 + Math.floor(index / 3) * 200
    };

    const nodeType = flowNode.type.toLowerCase();
    const node = createNodeData(nodeType, position);
    
    // Override with imported data
    node.id = flowNode.id;
    node.data.config.prompts = flowNode.prompts;
    node.data.config.transitions = flowNode.transitions;
    node.data.config.fallback = flowNode.fallback;
    
    if (flowNode.storeAttribute) {
      node.data.config.storeAttribute = flowNode.storeAttribute;
    }
    
    if (flowNode.templateId) {
      node.data.config.templateId = flowNode.templateId;
    }
    
    // Import dynamic menu fields for Action nodes
    if (flowNode.templateId) {
      node.data.config.templateId = flowNode.templateId;
    }
    if (flowNode.sessionSpec) {
      node.data.config.sessionSpec = flowNode.sessionSpec;
    }
    if (flowNode.menuName) {
      node.data.config.menuName = flowNode.menuName;
    }
    if (flowNode.menuJolt) {
      node.data.config.menuJolt = flowNode.menuJolt;
    }
    if (flowNode.isNextMenuDynamic) {
      node.data.config.isNextMenuDynamic = flowNode.isNextMenuDynamic;
    }

    return node;
  });
};

export const generateEdgesFromNodes = (nodes) => {
  const edges = [];
  
  nodes.forEach(node => {
    const transitions = node.data.config.transitions || {};
    
    Object.entries(transitions).forEach(([key, targetId]) => {
      if (targetId && targetId.trim() !== '') {
        const sourceHandle = key === '' ? null : key;
        edges.push(createEdge(node.id, targetId, sourceHandle, true, null));
      }
    });
    
    // Handle fallback edges
    if (node.data.config.fallback && node.data.config.fallback.trim() !== '') {
      edges.push(createEdge(node.id, node.data.config.fallback, 'fallback', true, null));
    }
  });
  
  return edges;
};

export const validateFlow = (nodes, edges) => {
  const errors = [];
  const warnings = [];
  
  // Check for start node
  const startNodes = nodes.filter(node => node.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Flow must have at least one START node');
  } else if (startNodes.length > 1) {
    warnings.push('Multiple START nodes detected - only the first one will be used');
  }
  
  // Check for end nodes
  const endNodes = nodes.filter(node => node.type === 'end');
  if (endNodes.length === 0) {
    warnings.push('Flow should have at least one END node for proper termination');
  }
  
  // Check for orphaned nodes (except START nodes)
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  const orphanedNodes = nodes.filter(node => 
    node.type !== 'start' && !connectedNodeIds.has(node.id)
  );
  
  if (orphanedNodes.length > 0) {
    warnings.push(`${orphanedNodes.length} orphaned nodes detected: ${orphanedNodes.map(n => n.id).join(', ')}`);
  }
  
  // Check for missing prompts
  nodes.forEach(node => {
    const prompts = node.data.config?.prompts || {};
    const hasPrompts = Object.values(prompts).some(prompt => prompt && prompt.trim() !== '');
    
    if (!hasPrompts && node.type !== 'end') {
      warnings.push(`Node ${node.id} (${node.type}) has no prompts configured`);
    }
  });
  
  // Check for missing transitions
  nodes.forEach(node => {
    const transitions = node.data.config?.transitions || {};
    const hasTransitions = Object.values(transitions).some(target => target && target.trim() !== '');
    const hasOutgoingEdges = edges.some(edge => edge.source === node.id);
    
    if (node.type !== 'end' && !hasTransitions && !hasOutgoingEdges) {
      warnings.push(`Node ${node.id} (${node.type}) has no outgoing connections`);
    }
  });
  
  // Check for INPUT nodes without variable names
  nodes.forEach(node => {
    if (node.type === 'input' && !node.data.config?.variableName) {
      errors.push(`INPUT node ${node.id} must have a variable name`);
    }
  });
  
  // Check for ACTION nodes without templates
  nodes.forEach(node => {
    if (node.type === 'action') {
      const templates = node.data.config?.templates || [];
      if (templates.length === 0) {
        warnings.push(`ACTION node ${node.id} has no API templates configured`);
      }
    }
  });
  
  // Check for circular references
  const visited = new Set();
  const recursionStack = new Set();
  
  const hasCycle = (nodeId) => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.target)) return true;
    }
    
    recursionStack.delete(nodeId);
    return false;
  };
  
  for (const node of nodes) {
    if (hasCycle(node.id)) {
      errors.push('Circular reference detected in the flow');
      break;
    }
  }
  
  return { errors, warnings };
};

export const autoLayout = (nodes, edges) => {
  console.log('🎯 AutoLayout starting with:', { nodes, edges });
  
  if (!nodes || nodes.length === 0) {
    console.log('❌ No nodes found!');
    return nodes;
  }
  
  // Advanced auto-layout with multiple visualization improvements for long flows
  const layoutNodes = nodes.map(node => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data }
  }));
  
  const nodeMap = new Map(layoutNodes.map(node => [node.id, node]));
  
  // 1. Build adjacency list from edges
  const adjacencyList = new Map();
  layoutNodes.forEach(node => {
    adjacencyList.set(node.id, { outgoing: [], incoming: [] });
  });
  
  edges.forEach(edge => {
    if (adjacencyList.has(edge.source) && adjacencyList.has(edge.target)) {
      adjacencyList.get(edge.source).outgoing.push(edge.target);
      adjacencyList.get(edge.target).incoming.push(edge.source);
    }
  });
  
  // 2. Find optimal starting points
  const startCandidates = [];
  let minIncoming = Infinity;
  
  layoutNodes.forEach(node => {
    const incomingCount = adjacencyList.get(node.id).incoming.length;
    if (incomingCount < minIncoming) {
      minIncoming = incomingCount;
      startCandidates.length = 0;
      startCandidates.push(node);
    } else if (incomingCount === minIncoming) {
      startCandidates.push(node);
    }
  });
  
  let startNode = startCandidates.find(node => node.type === 'start') ||
                  startCandidates.find(node => node.type === 'menu') ||
                  startCandidates[0];
  
  console.log('Selected start node:', startNode?.id, 'type:', startNode?.type);
  
  // 3. Detect flow patterns and apply appropriate layout strategy
  const totalNodes = layoutNodes.length;
  const layoutStrategy = getOptimalLayoutStrategy(totalNodes, edges.length);
  
  console.log(`📊 Flow Analysis: ${totalNodes} nodes, using ${layoutStrategy} strategy`);
  
  // 4. Apply layout based on strategy
  let layoutResult;
  switch (layoutStrategy) {
    case 'compact':
      layoutResult = applyCompactLayout(layoutNodes, edges, adjacencyList, startNode);
      break;
    case 'hierarchical':
      layoutResult = applyHierarchicalLayout(layoutNodes, edges, adjacencyList, startNode);
      break;
    case 'clustered':
      layoutResult = applyClusteredLayout(layoutNodes, edges, adjacencyList, startNode);
      break;
    case 'swim-lane':
      layoutResult = applySwimLaneLayout(layoutNodes, edges, adjacencyList, startNode);
      break;
    default:
      layoutResult = applyHierarchicalLayout(layoutNodes, edges, adjacencyList, startNode);
  }
  
  // 5. Final optimization for MENU node clutter reduction
  optimizeMenuNodeSpacing(layoutResult, edges, adjacencyList);
  
  console.log(`✅ AutoLayout completed with ${layoutStrategy} strategy`);
  return layoutResult;
};

// Final optimization to reduce MENU node visual clutter
const optimizeMenuNodeSpacing = (nodes, edges, adjacencyList) => {
  const menuNodes = nodes.filter(node => node.type === 'menu');
  if (menuNodes.length === 0) return;
  
  console.log(`🍽️ Final optimization for ${menuNodes.length} MENU nodes`);
  
  menuNodes.forEach(menuNode => {
    const connections = adjacencyList.get(menuNode.id);
    if (!connections) return;
    
    const outgoingCount = connections.outgoing.length;
    
    // For MENU nodes with many options, add buffer space
    if (outgoingCount > 4) {
      // Find nearby nodes that might be too close
      const nearbyNodes = findNearbyNodes(menuNode, nodes, 300); // Within 300px
      
      if (nearbyNodes.length > 2) {
        // Add some spacing to reduce visual clutter
        adjustSurroundingNodes(menuNode, nearbyNodes, outgoingCount);
      }
    }
  });
};

// Find nodes within a certain distance of a menu node
const findNearbyNodes = (centerNode, allNodes, maxDistance) => {
  return allNodes.filter(node => {
    if (node.id === centerNode.id) return false;
    
    const distance = Math.sqrt(
      Math.pow(node.position.x - centerNode.position.x, 2) +
      Math.pow(node.position.y - centerNode.position.y, 2)
    );
    
    return distance <= maxDistance;
  });
};

// Adjust surrounding nodes to give MENU nodes more breathing room
const adjustSurroundingNodes = (menuNode, nearbyNodes, connectionCount) => {
  const bufferDistance = Math.min(connectionCount * 15, 80); // Max 80px buffer
  
  nearbyNodes.forEach(node => {
    const dx = node.position.x - menuNode.position.x;
    const dy = node.position.y - menuNode.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 250) { // Too close
      const factor = (250 + bufferDistance) / distance;
      node.position.x = menuNode.position.x + dx * factor;
      node.position.y = menuNode.position.y + dy * factor;
    }
  });
  
  console.log(`🎯 Adjusted ${nearbyNodes.length} nodes around MENU with ${connectionCount} connections`);
};

// Determine optimal layout strategy based on flow characteristics
const getOptimalLayoutStrategy = (nodeCount, edgeCount) => {
  const complexity = edgeCount / nodeCount; // Average connections per node
  
  if (nodeCount <= 10) return 'compact';
  if (nodeCount <= 25) return 'hierarchical';
  if (complexity > 2.5) return 'clustered'; // Highly connected
  return 'swim-lane'; // Long flows
};

// Compact layout for small flows (≤10 nodes)
const applyCompactLayout = (nodes, edges, adjacencyList, startNode) => {
  console.log('🎯 Applying Compact Layout');
  
  const levels = assignLevels(nodes, adjacencyList, startNode);
  const levelGroups = groupByLevels(nodes, levels);
  
  // Tight spacing for compact view
  const nodeWidth = 200;
  const nodeHeight = 140;
  const horizontalSpacing = 80;
  const verticalSpacing = 30;
  
  positionNodesByLevels(levelGroups, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing);
  return nodes;
};

// Hierarchical layout for medium flows (11-25 nodes)
const applyHierarchicalLayout = (nodes, edges, adjacencyList, startNode) => {
  console.log('🎯 Applying Hierarchical Layout with MENU optimization');
  
  const levels = assignLevels(nodes, adjacencyList, startNode);
  const levelGroups = groupByLevels(nodes, levels);
  
  // Enhanced spacing to reduce MENU node clutter
  const nodeWidth = 250;
  const nodeHeight = 180;
  const horizontalSpacing = 140; // Increased from 120
  const verticalSpacing = 80; // Increased from 60
  
  // Sort nodes within levels with MENU-aware organization
  levelGroups.forEach((nodesInLevel, levelIndex) => {
    organizeNodesInLevel(nodesInLevel, levelIndex);
  });
  
  positionNodesByLevels(levelGroups, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing);
  optimizeEdgeLayout(nodes, edges, levelGroups, nodeHeight + verticalSpacing);
  
  // Special post-processing for MENU nodes to reduce visual clutter
  postProcessMenuNodes(nodes, edges, adjacencyList);
  
  return nodes;
};

// Organize nodes within a level for better visual clarity
const organizeNodesInLevel = (nodesInLevel, levelIndex) => {
  // Separate MENU nodes from others
  const menuNodes = nodesInLevel.filter(node => node.type === 'menu');
  const otherNodes = nodesInLevel.filter(node => node.type !== 'menu');
  
  // Sort MENU nodes by connection count (fewer connections first to reduce clutter)
  menuNodes.sort((a, b) => {
    // If we have access to adjacency list, use it; otherwise use simple heuristic
    return 0; // Keep original order if no adjacency data
  });
  
  // Sort other nodes by type priority
  const typePriority = { 'start': 0, 'input': 2, 'action': 3, 'end': 4 };
  otherNodes.sort((a, b) => {
    const aPriority = typePriority[a.type] || 5;
    const bPriority = typePriority[b.type] || 5;
    return aPriority - bPriority;
  });
  
  // Recombine: other nodes first, then MENU nodes (to give MENU nodes more space)
  nodesInLevel.length = 0;
  nodesInLevel.push(...otherNodes, ...menuNodes);
  
  console.log(`📋 Level ${levelIndex}: ${otherNodes.length} regular nodes, ${menuNodes.length} MENU nodes`);
};

// Post-process MENU nodes to improve visual organization
const postProcessMenuNodes = (nodes, edges, adjacencyList) => {
  const menuNodes = nodes.filter(node => node.type === 'menu');
  
  console.log(`🍽️ Post-processing ${menuNodes.length} MENU nodes for better organization`);
  
  menuNodes.forEach(menuNode => {
    const connections = adjacencyList.get(menuNode.id);
    if (connections && connections.outgoing.length > 3) {
      // For MENU nodes with many connections, slightly adjust positioning
      adjustMenuNodePosition(menuNode, connections, nodes);
    }
  });
};

// Adjust MENU node position to better accommodate many connections
const adjustMenuNodePosition = (menuNode, connections, allNodes) => {
  const connectedNodes = allNodes.filter(node => 
    connections.outgoing.includes(node.id) || connections.incoming.includes(node.id)
  );
  
  if (connectedNodes.length > 4) {
    // Add some extra horizontal spacing for nodes with many connections
    const extraSpacing = (connectedNodes.length - 4) * 20;
    menuNode.position.x += extraSpacing;
    
    console.log(`🎯 Adjusted MENU node position: +${extraSpacing}px for ${connectedNodes.length} connections`);
  }
};

// Clustered layout for highly connected flows
const applyClusteredLayout = (nodes, edges, adjacencyList, startNode) => {
  console.log('🎯 Applying Clustered Layout for highly connected flow');
  
  // Find high-degree nodes (especially MENU nodes) that need special handling
  const highDegreeNodes = nodes.filter(node => {
    const connections = adjacencyList.get(node.id);
    const totalDegree = connections.incoming.length + connections.outgoing.length;
    return totalDegree >= 3; // Nodes with 3+ connections
  });
  
  console.log(`📊 Found ${highDegreeNodes.length} high-degree nodes (including MENU nodes)`);
  
  const positioned = new Set();
  const clusters = [];
  
  // Start with the start node
  if (startNode) {
    startNode.position = { x: 100, y: 100 };
    positioned.add(startNode.id);
  }
  
  // Create clusters around high-degree nodes (especially MENU nodes)
  highDegreeNodes.forEach((centralNode, clusterIndex) => {
    if (positioned.has(centralNode.id)) return;
    
    const cluster = createMenuCluster(centralNode, adjacencyList, nodes, positioned, clusterIndex);
    clusters.push(cluster);
  });
  
  // Position remaining nodes in a simple grid
  const unpositioned = nodes.filter(node => !positioned.has(node.id));
  const gridCols = Math.ceil(Math.sqrt(unpositioned.length));
  
  unpositioned.forEach((node, index) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    node.position = {
      x: col * 300 + 100,
      y: row * 200 + 600 // Position below clusters
    };
    positioned.add(node.id);
  });
  
  console.log(`📊 Created ${clusters.length} clusters, ${unpositioned.length} additional nodes`);
  return nodes;
};

// Create a cluster around a central node (especially for MENU nodes)
const createMenuCluster = (centralNode, adjacencyList, allNodes, positioned, clusterIndex) => {
  const connections = adjacencyList.get(centralNode.id);
  const connectedNodeIds = [...connections.incoming, ...connections.outgoing];
  const connectedNodes = allNodes.filter(node => connectedNodeIds.includes(node.id));
  
  console.log(`🎯 Creating cluster ${clusterIndex} around ${centralNode.type || 'unknown'} node with ${connectedNodes.length} connections`);
  
  // Position central node
  const centerX = 200 + clusterIndex * 400;
  const centerY = 200 + clusterIndex * 300;
  
  if (!positioned.has(centralNode.id)) {
    centralNode.position = { x: centerX, y: centerY };
    positioned.add(centralNode.id);
  }
  
  // Arrange connected nodes in a smart pattern around the central node
  arrangeNodesAroundCenter(centralNode, connectedNodes, positioned, centerX, centerY);
  
  return {
    center: centralNode,
    nodes: connectedNodes,
    position: { x: centerX, y: centerY }
  };
};

// Arrange nodes around a center node in a circular/radial pattern
const arrangeNodesAroundCenter = (centralNode, connectedNodes, positioned, centerX, centerY) => {
  const unpositioned = connectedNodes.filter(node => !positioned.has(node.id));
  const radius = Math.max(150, unpositioned.length * 25); // Dynamic radius based on node count
  
  // Special handling for MENU nodes - organize by option numbers if available
  if (centralNode.type === 'menu') {
    arrangeMenuOptions(centralNode, unpositioned, positioned, centerX, centerY, radius);
  } else {
    // Standard radial arrangement for other node types
    arrangeRadially(unpositioned, positioned, centerX, centerY, radius);
  }
};

// Special arrangement for MENU node options to reduce clutter
const arrangeMenuOptions = (menuNode, connectedNodes, positioned, centerX, centerY, radius) => {
  console.log(`🍽️ Arranging ${connectedNodes.length} options around MENU node`);
  
  // Try to extract option numbers from node data or connections
  const sortedNodes = connectedNodes.sort((a, b) => {
    const aOption = extractOptionNumber(a, menuNode.id);
    const bOption = extractOptionNumber(b, menuNode.id);
    return aOption - bOption;
  });
  
  // Arrange in a semi-circle below the menu node for better readability
  sortedNodes.forEach((node, index) => {
    if (positioned.has(node.id)) return;
    
    const angle = Math.PI + (index / (sortedNodes.length - 1 || 1)) * Math.PI; // Semi-circle below
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius + 50; // Offset down
    
    node.position = { x, y };
    positioned.add(node.id);
  });
};

// Extract option number from node data (fallback to index)
const extractOptionNumber = (node, menuNodeId) => {
  // Try to extract from node data, label, or title
  const text = node.data?.label || node.data?.title || '';
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : 999; // High number for unmatched
};

// Standard radial arrangement
const arrangeRadially = (nodes, positioned, centerX, centerY, radius) => {
  nodes.forEach((node, index) => {
    if (positioned.has(node.id)) return;
    
    const angle = (index / nodes.length) * 2 * Math.PI;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    node.position = { x, y };
    positioned.add(node.id);
  });
};

// Swim-lane layout for very long flows (>25 nodes)
const applySwimLaneLayout = (nodes, edges, adjacencyList, startNode) => {
  console.log('🎯 Applying Swim-Lane Layout for long flow');
  
  // Enhanced swim lanes with better MENU node handling
  const swimLanes = new Map([
    ['start', { nodes: [], y: 50, color: '#10b981' }],
    ['menu', { nodes: [], y: 350, color: '#3b82f6' }],
    ['input', { nodes: [], y: 650, color: '#f59e0b' }],
    ['action', { nodes: [], y: 950, color: '#8b5cf6' }],
    ['end', { nodes: [], y: 1250, color: '#ef4444' }]
  ]);
  
  // Assign nodes to swim lanes
  nodes.forEach(node => {
    const laneKey = node.type || 'other';
    if (swimLanes.has(laneKey)) {
      swimLanes.get(laneKey).nodes.push(node);
    } else {
      if (!swimLanes.has('other')) {
        swimLanes.set('other', { nodes: [], y: 1550, color: '#64748b' });
      }
      swimLanes.get('other').nodes.push(node);
    }
  });
  
  // Special handling for MENU nodes to reduce clutter
  const menuLane = swimLanes.get('menu');
  if (menuLane && menuLane.nodes.length > 0) {
    organizeMenuNodesForClarity(menuLane.nodes, edges, adjacencyList);
  }
  
  // Position nodes within each swim lane with smart spacing
  swimLanes.forEach((lane, laneType) => {
    const laneNodes = lane.nodes;
    const baseSpacing = 280;
    
    // Adjust spacing based on lane density and connections
    const spacing = calculateOptimalSpacing(laneNodes, edges, baseSpacing);
    
    laneNodes.forEach((node, index) => {
      node.position = {
        x: index * spacing + 100,
        y: lane.y
      };
    });
    
    console.log(`📊 ${laneType.toUpperCase()} lane: ${laneNodes.length} nodes, spacing: ${spacing}px`);
  });
  
  return nodes;
};

// Special organization for MENU nodes to reduce visual clutter
const organizeMenuNodesForClarity = (menuNodes, edges, adjacencyList) => {
  console.log('🎯 Organizing MENU nodes for better clarity');
  
  // Sort MENU nodes by number of outgoing connections (most connected first)
  menuNodes.sort((a, b) => {
    const aConnections = adjacencyList.get(a.id).outgoing.length;
    const bConnections = adjacencyList.get(b.id).outgoing.length;
    return bConnections - aConnections; // Descending order
  });
  
  // Group MENU nodes by their connection patterns
  const menuGroups = new Map();
  
  menuNodes.forEach(menuNode => {
    const connections = adjacencyList.get(menuNode.id).outgoing;
    const groupKey = getMenuGroupKey(menuNode, connections, edges);
    
    if (!menuGroups.has(groupKey)) {
      menuGroups.set(groupKey, []);
    }
    menuGroups.get(groupKey).push(menuNode);
  });
  
  console.log(`📊 Created ${menuGroups.size} MENU groups to reduce clutter`);
  
  // Reorganize the menuNodes array based on groups
  let reorganizedNodes = [];
  menuGroups.forEach((groupNodes, groupKey) => {
    console.log(`📋 Group "${groupKey}": ${groupNodes.length} nodes`);
    reorganizedNodes = reorganizedNodes.concat(groupNodes);
  });
  
  // Update the original array
  menuNodes.length = 0;
  menuNodes.push(...reorganizedNodes);
};

// Determine grouping key for MENU nodes based on their connections
const getMenuGroupKey = (menuNode, connections, edges) => {
  if (connections.length === 0) return 'isolated';
  if (connections.length === 1) return 'simple';
  if (connections.length <= 3) return 'standard';
  if (connections.length <= 6) return 'complex';
  return 'hub'; // Very connected nodes
};

// Calculate optimal spacing based on node density and connections
const calculateOptimalSpacing = (laneNodes, edges, baseSpacing) => {
  if (laneNodes.length <= 3) return baseSpacing + 50; // More space for few nodes
  if (laneNodes.length <= 6) return baseSpacing;
  if (laneNodes.length <= 10) return baseSpacing - 30;
  return Math.max(baseSpacing - 50, 200); // Minimum 200px spacing
};

// Helper functions
const assignLevels = (nodes, adjacencyList, startNode) => {
  const levels = new Map();
  const visited = new Set();
  const queue = [{ nodeId: startNode.id, level: 0 }];
  
  levels.set(startNode.id, 0);
  visited.add(startNode.id);
  
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift();
    const outgoing = adjacencyList.get(nodeId).outgoing;
    
    outgoing.forEach(targetId => {
      if (!visited.has(targetId)) {
        levels.set(targetId, level + 1);
        visited.add(targetId);
        queue.push({ nodeId: targetId, level: level + 1 });
      }
    });
  }
  
  // Handle disconnected components
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });
  
  return levels;
};

const groupByLevels = (nodes, levels) => {
  const levelGroups = new Map();
  const maxLevel = Math.max(...levels.values());
  
  for (let i = 0; i <= maxLevel; i++) {
    levelGroups.set(i, []);
  }
  
  nodes.forEach(node => {
    const level = levels.get(node.id);
    levelGroups.get(level).push(node);
  });
  
  return levelGroups;
};

const positionNodesByLevels = (levelGroups, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing) => {
  const levelWidth = nodeWidth + horizontalSpacing;
  
  levelGroups.forEach((nodesInLevel, level) => {
    const levelHeight = nodesInLevel.length * (nodeHeight + verticalSpacing);
    const startY = -levelHeight / 2 + 400; // Center vertically with offset
    
    nodesInLevel.forEach((node, index) => {
      node.position = {
        x: level * levelWidth + 50,
        y: startY + index * (nodeHeight + verticalSpacing)
      };
    });
  });
};

const getClusterKey = (node, adjacencyList) => {
  // Group by node type and connection density
  const connections = adjacencyList.get(node.id);
  const totalConnections = connections.incoming.length + connections.outgoing.length;
  
  if (totalConnections === 0) return 'isolated';
  if (totalConnections >= 4) return `highly-connected-${node.type}`;
  return `normal-${node.type}`;
};

const positionNodesInCluster = (nodes, clusterX, clusterY, clusterWidth, clusterHeight) => {
  const nodesPerRow = Math.ceil(Math.sqrt(nodes.length));
  const nodeSpacing = Math.min(clusterWidth / nodesPerRow, clusterHeight / nodesPerRow) * 0.8;
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;
    
    node.position = {
      x: clusterX + col * nodeSpacing + nodeSpacing / 2,
      y: clusterY + row * nodeSpacing + nodeSpacing / 2
    };
  });
};

// Helper function to minimize edge crossings
const optimizeEdgeLayout = (nodes, edges, levelGroups, nodeSpacing) => {
  console.log('🔄 Optimizing edge layout to reduce crossings...');
  
  // For each level, try to minimize crossings with the next level
  levelGroups.forEach((currentLevel, levelIndex) => {
    const nextLevel = levelGroups.get(levelIndex + 1);
    if (!nextLevel || nextLevel.length <= 1) return;
    
    // Count connections between current and next level
    const connections = new Map();
    currentLevel.forEach(sourceNode => {
      edges.forEach(edge => {
        if (edge.source === sourceNode.id) {
          const targetNode = nextLevel.find(n => n.id === edge.target);
          if (targetNode) {
            if (!connections.has(sourceNode.id)) {
              connections.set(sourceNode.id, []);
            }
            connections.get(sourceNode.id).push(targetNode.id);
          }
        }
      });
    });
    
    // Simple reordering to reduce crossings
    const reorderedNextLevel = [...nextLevel];
    reorderedNextLevel.sort((a, b) => {
      // Find average position of sources connecting to each target
      const aConnections = [];
      const bConnections = [];
      
      connections.forEach((targets, sourceId) => {
        if (targets.includes(a.id)) {
          const sourceNode = currentLevel.find(n => n.id === sourceId);
          if (sourceNode) aConnections.push(sourceNode.position.y);
        }
        if (targets.includes(b.id)) {
          const sourceNode = currentLevel.find(n => n.id === sourceId);
          if (sourceNode) bConnections.push(sourceNode.position.y);
        }
      });
      
      const aAvg = aConnections.length > 0 ? 
        aConnections.reduce((sum, y) => sum + y, 0) / aConnections.length : a.position.y;
      const bAvg = bConnections.length > 0 ? 
        bConnections.reduce((sum, y) => sum + y, 0) / bConnections.length : b.position.y;
      
      return aAvg - bAvg;
    });
    
    // Update positions for reordered nodes
    reorderedNextLevel.forEach((node, index) => {
      const levelHeight = reorderedNextLevel.length * nodeSpacing;
      const startY = -levelHeight / 2 + 300;
      node.position.y = startY + index * nodeSpacing;
    });
  });
};
