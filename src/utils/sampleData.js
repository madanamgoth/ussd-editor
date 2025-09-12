import { browserStorageFallback } from '../utils/gitWorkflow';

// Sample approved graphs for demo
const sampleApprovedGraphs = [
  {
    id: 'banking_main_menu',
    nodes: [
      {
        id: 'start_demo_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: {
          id: 'start_demo_1',
          label: 'Banking Start',
          type: 'START',
          config: {
            prompts: {
              en: 'Welcome to Banking Services',
              es: 'Bienvenido a Servicios Bancarios'
            },
            transitions: { '': 'menu_demo_1' },
            defaultLanguage: 'en',
            ussdCode: '*123#'
          }
        }
      },
      {
        id: 'menu_demo_1',
        type: 'menu',
        position: { x: 400, y: 100 },
        data: {
          id: 'menu_demo_1',
          label: 'Main Banking Menu',
          type: 'MENU',
          config: {
            prompts: {
              en: '1. Check Balance\n2. Transfer Money\n3. Pay Bills\n4. Exit',
              es: '1. Consultar Saldo\n2. Transferir Dinero\n3. Pagar Facturas\n4. Salir'
            },
            transitions: {
              'option-1': 'end_demo_1',
              'option-2': 'end_demo_2',
              'option-3': 'end_demo_3',
              'option-4': 'end_demo_4'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_demo_1',
        type: 'end',
        position: { x: 200, y: 300 },
        data: {
          id: 'end_demo_1',
          label: 'Balance Check End',
          type: 'END',
          config: {
            prompts: {
              en: 'Your balance is $100. Thank you!',
              es: 'Su saldo es $100. ¡Gracias!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_demo_2',
        type: 'end',
        position: { x: 400, y: 300 },
        data: {
          id: 'end_demo_2',
          label: 'Transfer End',
          type: 'END',
          config: {
            prompts: {
              en: 'Transfer completed successfully.',
              es: 'Transferencia completada exitosamente.'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_demo_3',
        type: 'end',
        position: { x: 600, y: 300 },
        data: {
          id: 'end_demo_3',
          label: 'Bill Payment End',
          type: 'END',
          config: {
            prompts: {
              en: 'Bill payment processed.',
              es: 'Pago de factura procesado.'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_demo_4',
        type: 'end',
        position: { x: 800, y: 300 },
        data: {
          id: 'end_demo_4',
          label: 'Exit',
          type: 'END',
          config: {
            prompts: {
              en: 'Thank you for using our services!',
              es: '¡Gracias por usar nuestros servicios!'
            },
            defaultLanguage: 'en'
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'start_demo_1',
        target: 'menu_demo_1',
        type: 'custom'
      },
      {
        id: 'e2',
        source: 'menu_demo_1',
        sourceHandle: 'option-1',
        target: 'end_demo_1',
        type: 'custom'
      },
      {
        id: 'e3',
        source: 'menu_demo_1',
        sourceHandle: 'option-2',
        target: 'end_demo_2',
        type: 'custom'
      },
      {
        id: 'e4',
        source: 'menu_demo_1',
        sourceHandle: 'option-3',
        target: 'end_demo_3',
        type: 'smoothstep'
      },
      {
        id: 'e5',
        source: 'menu_demo_1',
        sourceHandle: 'option-4',
        target: 'end_demo_4',
        type: 'smoothstep'
      }
    ],
    metadata: {
      name: 'Banking Main Menu',
      description: 'Basic banking services menu with balance check, transfers, and bill payments',
      version: '1.0.0',
      approvedAt: '2025-01-01T10:00:00.000Z',
      approvedBy: 'System Admin',
      status: 'approved'
    }
  },
  {
    id: 'mobile_money_flow',
    nodes: [
      {
        id: 'start_mobile_1',
        type: 'start',
        position: { x: 50, y: 100 },
        data: {
          id: 'start_mobile_1',
          label: 'Mobile Money Start',
          type: 'START',
          config: {
            prompts: {
              en: 'Welcome to Mobile Money Services',
              sw: 'Karibu kwenye huduma za Mobile Money'
            },
            transitions: { '': 'input_mobile_1' },
            defaultLanguage: 'en',
            ussdCode: '*150#'
          }
        }
      },
      {
        id: 'input_mobile_1',
        type: 'input',
        position: { x: 300, y: 100 },
        data: {
          id: 'input_mobile_1',
          label: 'Enter PIN',
          type: 'INPUT',
          config: {
            prompts: {
              en: 'Enter your 4-digit PIN:',
              sw: 'Weka PIN yako ya tarakimu 4:'
            },
            transitions: { '': 'menu_mobile_1' },
            defaultLanguage: 'en',
            variableName: 'USER_PIN'
          }
        }
      },
      {
        id: 'menu_mobile_1',
        type: 'menu',
        position: { x: 550, y: 100 },
        data: {
          id: 'menu_mobile_1',
          label: 'Mobile Money Menu',
          type: 'MENU',
          config: {
            prompts: {
              en: '1. Send Money\n2. Check Balance\n3. Buy Airtime\n4. Exit',
              sw: '1. Tuma Pesa\n2. Angalia Salio\n3. Nunua Airtime\n4. Ondoka'
            },
            transitions: {
              'option-1': 'end_mobile_1',
              'option-2': 'end_mobile_2',
              'option-3': 'end_mobile_3',
              'option-4': 'end_mobile_4'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_mobile_1',
        type: 'end',
        position: { x: 200, y: 300 },
        data: {
          id: 'end_mobile_1',
          label: 'Send Money Complete',
          type: 'END',
          config: {
            prompts: {
              en: 'Money sent successfully!',
              sw: 'Pesa imetumwa kikamilifu!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_mobile_2',
        type: 'end',
        position: { x: 400, y: 300 },
        data: {
          id: 'end_mobile_2',
          label: 'Balance Check',
          type: 'END',
          config: {
            prompts: {
              en: 'Your balance is $50.00',
              sw: 'Salio lako ni $50.00'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_mobile_3',
        type: 'end',
        position: { x: 600, y: 300 },
        data: {
          id: 'end_mobile_3',
          label: 'Airtime Purchase',
          type: 'END',
          config: {
            prompts: {
              en: 'Airtime purchased successfully!',
              sw: 'Airtime imenunuliwa kikamilifu!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_mobile_4',
        type: 'end',
        position: { x: 800, y: 300 },
        data: {
          id: 'end_mobile_4',
          label: 'Exit',
          type: 'END',
          config: {
            prompts: {
              en: 'Thank you for using Mobile Money!',
              sw: 'Asante kwa kutumia Mobile Money!'
            },
            defaultLanguage: 'en'
          }
        }
      }
    ],
    edges: [
      {
        id: 'em1',
        source: 'start_mobile_1',
        target: 'input_mobile_1',
        type: 'smoothstep'
      },
      {
        id: 'em2',
        source: 'input_mobile_1',
        target: 'menu_mobile_1',
        type: 'smoothstep'
      },
      {
        id: 'em3',
        source: 'menu_mobile_1',
        sourceHandle: 'option-1',
        target: 'end_mobile_1',
        type: 'smoothstep'
      },
      {
        id: 'em4',
        source: 'menu_mobile_1',
        sourceHandle: 'option-2',
        target: 'end_mobile_2',
        type: 'smoothstep'
      },
      {
        id: 'em5',
        source: 'menu_mobile_1',
        sourceHandle: 'option-3',
        target: 'end_mobile_3',
        type: 'smoothstep'
      },
      {
        id: 'em6',
        source: 'menu_mobile_1',
        sourceHandle: 'option-4',
        target: 'end_mobile_4',
        type: 'smoothstep'
      }
    ],
    metadata: {
      name: 'Mobile Money Services',
      description: 'Complete mobile money flow with PIN entry, menu options and transaction endpoints',
      version: '2.1.0',
      approvedAt: '2024-12-15T14:30:00.000Z',
      approvedBy: 'Product Manager',
      status: 'approved'
    }
  }
];

// Sample pending graphs for demo
const samplePendingGraphs = [
  {
    id: 'insurance_claim_flow',
    nodes: [
      {
        id: 'start_insurance_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: {
          id: 'start_insurance_1',
          label: 'Insurance Claims',
          type: 'START',
          config: {
            prompts: {
              en: 'Welcome to Insurance Claims Service',
              fr: 'Bienvenue au Service de Réclamations d\'Assurance'
            },
            transitions: { '': 'menu_insurance_1' },
            defaultLanguage: 'en',
            ussdCode: '*789#'
          }
        }
      },
      {
        id: 'menu_insurance_1',
        type: 'menu',
        position: { x: 400, y: 100 },
        data: {
          id: 'menu_insurance_1',
          label: 'Claims Menu',
          type: 'MENU',
          config: {
            prompts: {
              en: '1. File New Claim\n2. Check Claim Status\n3. Update Information\n4. Contact Support\n5. Exit',
              fr: '1. Déposer une Nouvelle Réclamation\n2. Vérifier le Statut\n3. Mettre à Jour\n4. Support\n5. Sortir'
            },
            transitions: {
              'option-1': 'input_insurance_1',
              'option-2': 'action_insurance_1',
              'option-3': 'input_insurance_2',
              'option-4': 'end_insurance_1',
              'option-5': 'end_insurance_2'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'input_insurance_1',
        type: 'input',
        position: { x: 100, y: 300 },
        data: {
          id: 'input_insurance_1',
          label: 'Policy Number',
          type: 'INPUT',
          config: {
            prompts: {
              en: 'Enter your policy number:',
              fr: 'Entrez votre numéro de police:'
            },
            transitions: { '': 'end_insurance_3' },
            defaultLanguage: 'en',
            variableName: 'POLICY_NUMBER'
          }
        }
      },
      {
        id: 'action_insurance_1',
        type: 'action',
        position: { x: 300, y: 300 },
        data: {
          id: 'action_insurance_1',
          label: 'Check Status API',
          type: 'ACTION',
          config: {
            prompts: { en: '', fr: '' },
            transitions: {
              'transaction-200': 'end_insurance_4',
              'transaction-400': 'end_insurance_5'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'input_insurance_2',
        type: 'input',
        position: { x: 500, y: 300 },
        data: {
          id: 'input_insurance_2',
          label: 'Update Phone',
          type: 'INPUT',
          config: {
            prompts: {
              en: 'Enter new phone number:',
              fr: 'Entrez le nouveau numéro de téléphone:'
            },
            transitions: { '': 'end_insurance_6' },
            defaultLanguage: 'en',
            variableName: 'NEW_PHONE'
          }
        }
      },
      {
        id: 'end_insurance_1',
        type: 'end',
        position: { x: 700, y: 300 },
        data: {
          id: 'end_insurance_1',
          label: 'Support Contact',
          type: 'END',
          config: {
            prompts: {
              en: 'Call support at 1-800-HELP',
              fr: 'Appelez le support au 1-800-HELP'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_insurance_2',
        type: 'end',
        position: { x: 900, y: 200 },
        data: {
          id: 'end_insurance_2',
          label: 'Exit',
          type: 'END',
          config: {
            prompts: {
              en: 'Thank you for using our service!',
              fr: 'Merci d\'utiliser notre service!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_insurance_3',
        type: 'end',
        position: { x: 100, y: 500 },
        data: {
          id: 'end_insurance_3',
          label: 'Claim Filed',
          type: 'END',
          config: {
            prompts: {
              en: 'Your claim has been filed successfully!',
              fr: 'Votre réclamation a été déposée avec succès!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_insurance_4',
        type: 'end',
        position: { x: 300, y: 500 },
        data: {
          id: 'end_insurance_4',
          label: 'Status Found',
          type: 'END',
          config: {
            prompts: {
              en: 'Your claim status: Under Review',
              fr: 'Statut de votre réclamation: En Révision'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_insurance_5',
        type: 'end',
        position: { x: 500, y: 500 },
        data: {
          id: 'end_insurance_5',
          label: 'Status Not Found',
          type: 'END',
          config: {
            prompts: {
              en: 'Claim not found. Please contact support.',
              fr: 'Réclamation non trouvée. Contactez le support.'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_insurance_6',
        type: 'end',
        position: { x: 700, y: 500 },
        data: {
          id: 'end_insurance_6',
          label: 'Info Updated',
          type: 'END',
          config: {
            prompts: {
              en: 'Information updated successfully!',
              fr: 'Informations mises à jour avec succès!'
            },
            defaultLanguage: 'en'
          }
        }
      }
    ],
    edges: [
      { id: 'ei1', source: 'start_insurance_1', target: 'menu_insurance_1', type: 'smoothstep' },
      { id: 'ei2', source: 'menu_insurance_1', sourceHandle: 'option-1', target: 'input_insurance_1', type: 'smoothstep' },
      { id: 'ei3', source: 'menu_insurance_1', sourceHandle: 'option-2', target: 'action_insurance_1', type: 'smoothstep' },
      { id: 'ei4', source: 'menu_insurance_1', sourceHandle: 'option-3', target: 'input_insurance_2', type: 'smoothstep' },
      { id: 'ei5', source: 'menu_insurance_1', sourceHandle: 'option-4', target: 'end_insurance_1', type: 'smoothstep' },
      { id: 'ei6', source: 'menu_insurance_1', sourceHandle: 'option-5', target: 'end_insurance_2', type: 'smoothstep' },
      { id: 'ei7', source: 'input_insurance_1', target: 'end_insurance_3', type: 'smoothstep' },
      { id: 'ei8', source: 'action_insurance_1', sourceHandle: 'transaction-200', target: 'end_insurance_4', type: 'smoothstep' },
      { id: 'ei9', source: 'action_insurance_1', sourceHandle: 'transaction-400', target: 'end_insurance_5', type: 'smoothstep' },
      { id: 'ei10', source: 'input_insurance_2', target: 'end_insurance_6', type: 'smoothstep' }
    ],
    metadata: {
      name: 'Insurance Claims Portal',
      description: 'Comprehensive insurance claims management system with multi-language support and various claim operations',
      version: '1.0.0',
      baseVersion: null,
      submittedBy: 'Insurance Team Lead',
      submittedAt: '2025-01-10T09:15:00.000Z',
      status: 'pending_review'
    }
  },
  {
    id: 'enhanced_banking_menu',
    nodes: [
      {
        id: 'start_enhanced_1',
        type: 'start',
        position: { x: 100, y: 100 },
        data: {
          id: 'start_enhanced_1',
          label: 'Enhanced Banking Start',
          type: 'START',
          config: {
            prompts: {
              en: 'Welcome to Enhanced Banking Services - Now with Loans!',
              es: 'Bienvenido a Servicios Bancarios Mejorados - ¡Ahora con Préstamos!'
            },
            transitions: { '': 'menu_enhanced_1' },
            defaultLanguage: 'en',
            ussdCode: '*123#'
          }
        }
      },
      {
        id: 'menu_enhanced_1',
        type: 'menu',
        position: { x: 400, y: 100 },
        data: {
          id: 'menu_enhanced_1',
          label: 'Enhanced Banking Menu',
          type: 'MENU',
          config: {
            prompts: {
              en: '1. Check Balance\n2. Transfer Money\n3. Pay Bills\n4. Apply for Loan\n5. Loan Status\n6. Exit',
              es: '1. Consultar Saldo\n2. Transferir Dinero\n3. Pagar Facturas\n4. Solicitar Préstamo\n5. Estado del Préstamo\n6. Salir'
            },
            transitions: {
              'option-1': 'end_enhanced_1',
              'option-2': 'end_enhanced_2',
              'option-3': 'end_enhanced_3',
              'option-4': 'input_enhanced_1',
              'option-5': 'action_enhanced_1',
              'option-6': 'end_enhanced_4'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'input_enhanced_1',
        type: 'input',
        position: { x: 200, y: 300 },
        data: {
          id: 'input_enhanced_1',
          label: 'Loan Amount',
          type: 'INPUT',
          config: {
            prompts: {
              en: 'Enter loan amount requested:',
              es: 'Ingrese el monto del préstamo solicitado:'
            },
            transitions: { '': 'end_enhanced_5' },
            defaultLanguage: 'en',
            variableName: 'LOAN_AMOUNT'
          }
        }
      },
      {
        id: 'action_enhanced_1',
        type: 'action',
        position: { x: 600, y: 300 },
        data: {
          id: 'action_enhanced_1',
          label: 'Check Loan Status',
          type: 'ACTION',
          config: {
            prompts: { en: '', es: '' },
            transitions: {
              'transaction-200': 'end_enhanced_6',
              'transaction-404': 'end_enhanced_7'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_1',
        type: 'end',
        position: { x: 100, y: 500 },
        data: {
          id: 'end_enhanced_1',
          label: 'Balance Check End',
          type: 'END',
          config: {
            prompts: {
              en: 'Your current balance is $1,250.75. Thank you!',
              es: 'Su saldo actual es $1,250.75. ¡Gracias!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_2',
        type: 'end',
        position: { x: 250, y: 500 },
        data: {
          id: 'end_enhanced_2',
          label: 'Transfer End',
          type: 'END',
          config: {
            prompts: {
              en: 'Transfer completed successfully. Fee: $2.00',
              es: 'Transferencia completada exitosamente. Tarifa: $2.00'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_3',
        type: 'end',
        position: { x: 400, y: 500 },
        data: {
          id: 'end_enhanced_3',
          label: 'Bill Payment End',
          type: 'END',
          config: {
            prompts: {
              en: 'Bill payment processed. Confirmation: BP123456',
              es: 'Pago de factura procesado. Confirmación: BP123456'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_4',
        type: 'end',
        position: { x: 800, y: 200 },
        data: {
          id: 'end_enhanced_4',
          label: 'Exit',
          type: 'END',
          config: {
            prompts: {
              en: 'Thank you for using Enhanced Banking Services!',
              es: '¡Gracias por usar los Servicios Bancarios Mejorados!'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_5',
        type: 'end',
        position: { x: 550, y: 500 },
        data: {
          id: 'end_enhanced_5',
          label: 'Loan Application',
          type: 'END',
          config: {
            prompts: {
              en: 'Loan application submitted. Reference: LN789123',
              es: 'Solicitud de préstamo enviada. Referencia: LN789123'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_6',
        type: 'end',
        position: { x: 700, y: 500 },
        data: {
          id: 'end_enhanced_6',
          label: 'Loan Status Found',
          type: 'END',
          config: {
            prompts: {
              en: 'Loan Status: Approved - $5,000. Disbursement pending.',
              es: 'Estado del Préstamo: Aprobado - $5,000. Desembolso pendiente.'
            },
            defaultLanguage: 'en'
          }
        }
      },
      {
        id: 'end_enhanced_7',
        type: 'end',
        position: { x: 850, y: 500 },
        data: {
          id: 'end_enhanced_7',
          label: 'No Loan Found',
          type: 'END',
          config: {
            prompts: {
              en: 'No active loan applications found.',
              es: 'No se encontraron solicitudes de préstamo activas.'
            },
            defaultLanguage: 'en'
          }
        }
      }
    ],
    edges: [
      { id: 'ee1', source: 'start_enhanced_1', target: 'menu_enhanced_1', type: 'smoothstep' },
      { id: 'ee2', source: 'menu_enhanced_1', sourceHandle: 'option-1', target: 'end_enhanced_1', type: 'smoothstep' },
      { id: 'ee3', source: 'menu_enhanced_1', sourceHandle: 'option-2', target: 'end_enhanced_2', type: 'smoothstep' },
      { id: 'ee4', source: 'menu_enhanced_1', sourceHandle: 'option-3', target: 'end_enhanced_3', type: 'smoothstep' },
      { id: 'ee5', source: 'menu_enhanced_1', sourceHandle: 'option-4', target: 'input_enhanced_1', type: 'smoothstep' },
      { id: 'ee6', source: 'menu_enhanced_1', sourceHandle: 'option-5', target: 'action_enhanced_1', type: 'smoothstep' },
      { id: 'ee7', source: 'menu_enhanced_1', sourceHandle: 'option-6', target: 'end_enhanced_4', type: 'smoothstep' },
      { id: 'ee8', source: 'input_enhanced_1', target: 'end_enhanced_5', type: 'smoothstep' },
      { id: 'ee9', source: 'action_enhanced_1', sourceHandle: 'transaction-200', target: 'end_enhanced_6', type: 'smoothstep' },
      { id: 'ee10', source: 'action_enhanced_1', sourceHandle: 'transaction-404', target: 'end_enhanced_7', type: 'smoothstep' }
    ],
    metadata: {
      name: 'Enhanced Banking Menu',
      description: 'Updated banking services menu with new loan application and status check features. Added better balance display and confirmation numbers.',
      version: '1.1.0',
      baseVersion: '1.0.0',
      submittedBy: 'Banking Product Manager',
      submittedAt: '2025-01-11T16:45:00.000Z',
      status: 'pending_review'
    }
  }
];

// Initialize sample data
export const initializeSampleData = () => {
  // Check if data already exists
  const existingApproved = browserStorageFallback.getApprovedGraphs();
  const existingPending = browserStorageFallback.getPendingGraphs();

  // Only add sample data if none exists
  if (existingApproved.length === 0) {
    browserStorageFallback.setApprovedGraphs(sampleApprovedGraphs);
    console.log('✅ Sample approved graphs loaded:', sampleApprovedGraphs.length);
  }

  if (existingPending.length === 0) {
    browserStorageFallback.setPendingGraphs(samplePendingGraphs);
    console.log('✅ Sample pending graphs loaded:', samplePendingGraphs.length);
  }

  return {
    approvedCount: sampleApprovedGraphs.length,
    pendingCount: samplePendingGraphs.length
  };
};

// Clear all sample data (for demo reset)
export const clearSampleData = () => {
  browserStorageFallback.setApprovedGraphs([]);
  browserStorageFallback.setPendingGraphs([]);
  localStorage.removeItem('ussd-rejected-graphs');
  console.log('🗑️ All sample data cleared');
};

export { sampleApprovedGraphs, samplePendingGraphs };
