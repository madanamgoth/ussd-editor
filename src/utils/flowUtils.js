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

  return {
    id: edgeId,
    source,
    target,
    sourceHandle,
    type: 'smoothstep',
    animated,
    label: edgeLabel,
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
    labelBgPadding: [4, 8],
    labelBgBorderRadius: 4,
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
};

export const exportToFlowFormat = (nodes, edges) => {
  return nodes.map(node => {
    const nodeType = node.data.type;
    const config = node.data.config;
    
    // Build transitions from both config.transitions AND actual visual edges
    let cleanTransitions = {};
    
    // First, get transitions from visual edges (this captures the actual graph connections)
    if (edges) {
      const nodeEdges = edges.filter(edge => edge.source === node.id);
      nodeEdges.forEach(edge => {
        if (edge.target && edge.target.trim() !== '') {
          const sourceHandle = edge.sourceHandle || '';
          
          if (nodeType === 'INPUT') {
            // For INPUT nodes, use '*' for any connection
            cleanTransitions['*'] = edge.target;
          } else if (nodeType === 'ACTION') {
            // For ACTION nodes, clean up transaction codes
            let cleanKey = sourceHandle;
            if (sourceHandle.startsWith('transaction-')) {
              cleanKey = sourceHandle.replace('transaction-', '');
            }
            if (['200', '400', '500', 'onSuccess', 'onError', 'onBadRequest'].includes(cleanKey)) {
              cleanTransitions[cleanKey] = edge.target;
            }
          } else if (nodeType === 'MENU') {
            // For MENU nodes, clean up option handles
            if (sourceHandle.startsWith('option-')) {
              const optionNumber = sourceHandle.replace('option-', '');
              cleanTransitions[optionNumber] = edge.target;
            } else if (sourceHandle === 'fallback') {
              cleanTransitions['fallback'] = edge.target;
            } else if (sourceHandle === '*') {
              cleanTransitions['*'] = edge.target;
            }
          } else if (nodeType === 'START') {
            // For START nodes, use the handle as-is or empty string
            const key = sourceHandle || '';
            cleanTransitions[key] = edge.target;
          }
        }
      });
    }
    
    // Then, merge with any manually configured transitions (from config panel)
    // This ensures manual configurations are preserved if they exist
    if (config.transitions) {
      Object.entries(config.transitions).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          if (nodeType === 'MENU') {
            // For MENU nodes, prefer the cleaned key format
            const cleanKey = key.startsWith('option-') ? key.replace('option-', '') : key;
            if (/^\d+$/.test(cleanKey) || cleanKey === 'fallback' || cleanKey === '*') {
              cleanTransitions[cleanKey] = value;
            }
          } else if (nodeType === 'ACTION') {
            // For ACTION nodes, prefer cleaned transaction codes
            const cleanKey = key.startsWith('transaction-') ? key.replace('transaction-', '') : key;
            if (['200', '400', '500', 'onSuccess', 'onError', 'onBadRequest'].includes(cleanKey)) {
              cleanTransitions[cleanKey] = value;
            }
          } else {
            // For other node types, use as-is if not already set by edges
            if (!cleanTransitions[key]) {
              cleanTransitions[key] = value;
            }
          }
        }
      });
    }

    // Build the clean node object
    const cleanNode = {
      id: node.id,
      type: nodeType,
      prompts: config.prompts || {},
      transitions: cleanTransitions
    };

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
    
    if (config.fallback && config.fallback.trim() !== '' && nodeType !== 'MENU') {
      // For MENU nodes, fallback is already in transitions
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
  // Simple auto-layout algorithm
  const layoutNodes = [...nodes];
  const visited = new Set();
  const levels = new Map();
  
  // Find start node
  const startNode = layoutNodes.find(node => node.type === 'start');
  if (!startNode) return layoutNodes;
  
  // BFS to assign levels
  const queue = [{ node: startNode, level: 0 }];
  levels.set(startNode.id, 0);
  visited.add(startNode.id);
  
  while (queue.length > 0) {
    const { node, level } = queue.shift();
    const transitions = node.data.config.transitions || {};
    
    Object.values(transitions).forEach(targetId => {
      if (targetId && !visited.has(targetId)) {
        const targetNode = layoutNodes.find(n => n.id === targetId);
        if (targetNode) {
          levels.set(targetId, level + 1);
          visited.add(targetId);
          queue.push({ node: targetNode, level: level + 1 });
        }
      }
    });
  }
  
  // Position nodes based on levels
  const levelGroups = new Map();
  layoutNodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level).push(node);
  });
  
  levelGroups.forEach((nodesInLevel, level) => {
    nodesInLevel.forEach((node, index) => {
      node.position = {
        x: level * 300 + 50,
        y: index * 200 + 50
      };
    });
  });
  
  return layoutNodes;
};
