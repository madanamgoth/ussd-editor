// AI-powered flow generator from natural language descriptions
export class USSDFlowGenerator {
  
  static generateFromDescription(description) {
    const flowDescription = description.toLowerCase();
    const nodes = [];
    const edges = [];
    let nodeId = 1;

    // Parse the description and create nodes
    const parsedFlow = this.parseDescription(flowDescription);
    
    parsedFlow.forEach((step, index) => {
      const node = this.createNodeFromStep(step, nodeId++);
      nodes.push(node);
      
      // Create edges between sequential nodes
      if (index > 0) {
        const sourceNode = nodes[index - 1];
        edges.push(this.createConnectionEdge(sourceNode.id, node.id));
      }
    });

    return {
      graph: {
        nodes: this.positionNodes(nodes),
        edges: this.enhanceEdges(edges),
        timestamp: new Date().toISOString()
      },
      flow: this.convertToExportFormat(nodes)
    };
  }

  static parseDescription(description) {
    const steps = [];
    
    // Common patterns to identify different node types
    const patterns = {
      start: /^(start|begin|welcome|entry)/,
      menu: /(menu|options|choose|select)/,
      input: /(input|enter|type|provide|pin|amount|number)/,
      action: /(validate|send|check|process|execute|api|call)/,
      end: /(end|finish|complete|thank|goodbye)/
    };

    // Split description into sentences and analyze each
    const sentences = description.split(/[.!?]+/).filter(s => s.trim());
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      let nodeType = 'menu'; // default
      let details = trimmed;

      // Determine node type based on keywords
      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(trimmed)) {
          nodeType = type;
          break;
        }
      }

      steps.push({
        type: nodeType,
        description: details,
        originalText: trimmed
      });
    });

    // Ensure we have at least a start and end
    if (steps.length > 0 && steps[0].type !== 'start') {
      steps.unshift({
        type: 'start',
        description: 'welcome to our service',
        originalText: 'start'
      });
    }

    if (steps.length > 0 && steps[steps.length - 1].type !== 'end') {
      steps.push({
        type: 'end',
        description: 'thank you for using our service',
        originalText: 'end'
      });
    }

    return steps;
  }

  static createNodeFromStep(step, nodeId) {
    const id = `${step.type}_${nodeId}`;
    
    const nodeConfigs = {
      start: {
        prompts: {
          en: this.generatePrompt(step.description, 'start'),
          es: this.translatePrompt(step.description, 'es', 'start'),
          fr: this.translatePrompt(step.description, 'fr', 'start'),
          ar: this.translatePrompt(step.description, 'ar', 'start')
        },
        transitions: { '': '' },
        fallback: ''
      },
      menu: {
        prompts: {
          en: this.generateMenuOptions(step.description),
          es: this.translateMenuOptions(step.description, 'es'),
          fr: this.translateMenuOptions(step.description, 'fr'),
          ar: this.translateMenuOptions(step.description, 'ar')
        },
        transitions: this.generateMenuTransitions(step.description),
        fallback: ''
      },
      input: {
        prompts: {
          en: this.generatePrompt(step.description, 'input'),
          es: this.translatePrompt(step.description, 'es', 'input'),
          fr: this.translatePrompt(step.description, 'fr', 'input'),
          ar: this.translatePrompt(step.description, 'ar', 'input')
        },
        storeAttribute: this.extractAttributeName(step.description),
        transitions: { '*': '' },
        fallback: ''
      },
      action: {
        prompts: { en: '', es: '', fr: '', ar: '' },
        templateId: this.generateTemplateId(step.description),
        transitions: { '200': '', '400': '', '500': '' },
        fallback: ''
      },
      end: {
        prompts: {
          en: this.generatePrompt(step.description, 'end'),
          es: this.translatePrompt(step.description, 'es', 'end'),
          fr: this.translatePrompt(step.description, 'fr', 'end'),
          ar: this.translatePrompt(step.description, 'ar', 'end')
        },
        transitions: {},
        fallback: ''
      }
    };

    return {
      id,
      type: step.type,
      position: { x: 0, y: 0 }, // Will be positioned later
      data: {
        label: this.generateLabel(step.description, step.type),
        type: step.type.toUpperCase(),
        config: nodeConfigs[step.type]
      },
      measured: this.getNodeDimensions(step.type),
      selected: false,
      dragging: false
    };
  }

  static generatePrompt(description, type) {
    const prompts = {
      start: {
        default: 'Welcome to our service',
        login: 'Welcome! Please proceed with login',
        banking: 'Welcome to Mobile Banking',
        payment: 'Welcome to Payment Service'
      },
      input: {
        default: 'Please enter your input:',
        pin: 'Please enter your PIN:',
        amount: 'Please enter amount:',
        phone: 'Please enter phone number:',
        mobile: 'Please enter mobile number:'
      },
      end: {
        default: 'Thank you for using our service!',
        success: 'Transaction completed successfully!',
        error: 'We apologize for the inconvenience. Please try again.'
      }
    };

    // Try to match keywords in description
    for (const [key, prompt] of Object.entries(prompts[type] || {})) {
      if (description.includes(key)) {
        return prompt;
      }
    }

    return prompts[type]?.default || 'Please proceed';
  }

  static generateMenuOptions(description) {
    // Extract menu options from description
    const commonMenus = {
      'main menu': '1. Balance Inquiry\n2. Send Money\n3. Pay Bills\n4. Mini Statement',
      'banking': '1. Check Balance\n2. Transfer Money\n3. Pay Bills\n4. Transaction History',
      'payment': '1. Mobile Money\n2. Utility Bills\n3. Merchant Payment\n4. Airtime',
      'balance': '1. Account Balance\n2. Available Balance',
      'send money': '1. To Mobile\n2. To Bank Account\n3. To Wallet'
    };

    for (const [key, menu] of Object.entries(commonMenus)) {
      if (description.includes(key)) {
        return menu;
      }
    }

    // Default menu
    return '1. Option 1\n2. Option 2\n3. Option 3';
  }

  static generateMenuTransitions(description) {
    const menu = this.generateMenuOptions(description);
    const lines = menu.split('\n');
    const transitions = {};

    lines.forEach(line => {
      const match = line.match(/^(\d+)\./);
      if (match) {
        transitions[match[1]] = '';
      }
    });

    return transitions;
  }

  static extractAttributeName(description) {
    const attributes = {
      'pin': 'PIN',
      'amount': 'AMOUNT',
      'phone': 'PHONE_NUMBER',
      'mobile': 'MOBILE_NUMBER',
      'account': 'ACCOUNT_NUMBER',
      'password': 'PASSWORD',
      'name': 'USER_NAME'
    };

    for (const [key, attr] of Object.entries(attributes)) {
      if (description.includes(key)) {
        return attr;
      }
    }

    return 'USER_INPUT';
  }

  static generateTemplateId(description) {
    const templates = {
      'validate': 'VALIDATE_USER',
      'send': 'SEND_MONEY',
      'transfer': 'TRANSFER_FUNDS',
      'check': 'CHECK_BALANCE',
      'balance': 'GET_BALANCE',
      'pay': 'PAY_BILL',
      'login': 'USER_LOGIN',
      'authenticate': 'AUTHENTICATE_USER'
    };

    for (const [key, template] of Object.entries(templates)) {
      if (description.includes(key)) {
        return template;
      }
    }

    return 'EXECUTE_ACTION';
  }

  static generateLabel(description, type) {
    const words = description.split(' ').slice(0, 2);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  static translatePrompt(description, lang, type) {
    // Simple translation mapping - in real app, use translation service
    const translations = {
      es: {
        'Welcome to our service': 'Bienvenido a nuestro servicio',
        'Please enter your input:': 'Por favor ingrese su información:',
        'Please enter your PIN:': 'Por favor ingrese su PIN:',
        'Please enter amount:': 'Por favor ingrese el monto:',
        'Thank you for using our service!': '¡Gracias por usar nuestro servicio!'
      },
      fr: {
        'Welcome to our service': 'Bienvenue dans notre service',
        'Please enter your input:': 'Veuillez saisir votre entrée:',
        'Please enter your PIN:': 'Veuillez saisir votre PIN:',
        'Please enter amount:': 'Veuillez saisir le montant:',
        'Thank you for using our service!': 'Merci d\'utiliser notre service!'
      },
      ar: {
        'Welcome to our service': 'مرحباً بكم في خدمتنا',
        'Please enter your input:': 'يرجى إدخال بياناتك:',
        'Please enter your PIN:': 'يرجى إدخال الرقم السري:',
        'Please enter amount:': 'يرجى إدخال المبلغ:',
        'Thank you for using our service!': 'شكراً لاستخدام خدمتنا!'
      }
    };

    const prompt = this.generatePrompt(description, type);
    return translations[lang]?.[prompt] || '';
  }

  static translateMenuOptions(description, lang) {
    const menu = this.generateMenuOptions(description);
    
    const menuTranslations = {
      es: {
        'Balance Inquiry': 'Consulta de Saldo',
        'Send Money': 'Enviar Dinero',
        'Pay Bills': 'Pagar Facturas',
        'Mini Statement': 'Estado de Cuenta'
      },
      fr: {
        'Balance Inquiry': 'Demande de Solde',
        'Send Money': 'Envoyer de l\'Argent',
        'Pay Bills': 'Payer les Factures',
        'Mini Statement': 'Mini Relevé'
      },
      ar: {
        'Balance Inquiry': 'استعلام الرصيد',
        'Send Money': 'إرسال الأموال',
        'Pay Bills': 'دفع الفواتير',
        'Mini Statement': 'كشف حساب مصغر'
      }
    };

    let translatedMenu = menu;
    const translations = menuTranslations[lang] || {};
    
    Object.entries(translations).forEach(([english, translation]) => {
      translatedMenu = translatedMenu.replace(english, translation);
    });

    return translatedMenu;
  }

  static positionNodes(nodes) {
    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: 100 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 250
      }
    }));
  }

  static enhanceEdges(edges) {
    const colors = [
      '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
      '#84cc16', '#f97316', '#ec4899'
    ];

    return edges.map((edge, index) => ({
      ...edge,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
        color: colors[index % colors.length]
      },
      style: {
        strokeWidth: 2,
        stroke: colors[index % colors.length]
      }
    }));
  }

  static createConnectionEdge(sourceId, targetId) {
    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId
    };
  }

  static getNodeDimensions(type) {
    const dimensions = {
      start: { width: 200, height: 120 },
      menu: { width: 220, height: 200 },
      input: { width: 200, height: 150 },
      action: { width: 200, height: 140 },
      end: { width: 180, height: 100 }
    };
    
    return dimensions[type] || { width: 150, height: 100 };
  }

  static convertToExportFormat(nodes) {
    return nodes.map(node => ({
      id: node.id,
      type: node.data.type,
      prompts: node.data.config.prompts,
      transitions: node.data.config.transitions,
      fallback: node.data.config.fallback,
      ...(node.data.config.storeAttribute && { storeAttribute: node.data.config.storeAttribute }),
      ...(node.data.config.templateId && { templateId: node.data.config.templateId })
    }));
  }

  // Example usage method
  static generateExampleFlow() {
    const description = "USSD flow to login with PIN → validate user → show main menu (Balance / Send Money) → each option goes to action → end.";
    return this.generateFromDescription(description);
  }
}
