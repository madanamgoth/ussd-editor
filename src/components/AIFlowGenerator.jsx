import React, { useState } from 'react';
import { USSDFlowGenerator } from '../utils/flowGenerator';

const AIFlowGenerator = ({ onGenerate }) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please enter a description of your USSD flow');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const generatedFlow = USSDFlowGenerator.generateFromDescription(description);
      onGenerate(generatedFlow);
      setShowModal(false);
      setDescription('');
    } catch (error) {
      console.error('Error generating flow:', error);
      alert('Error generating flow. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExample = () => {
    setDescription("USSD flow to login with PIN → validate user → show main menu (Balance / Send Money) → each option goes to action → end.");
  };

  const examples = [
    {
      title: "Banking Flow",
      description: "Welcome to mobile banking → enter PIN → validate → main menu with balance check and money transfer → process actions → thank you"
    },
    {
      title: "Payment Flow", 
      description: "Payment service welcome → enter mobile number → enter amount → validate payment → confirm transaction → success message"
    },
    {
      title: "Airtime Purchase",
      description: "Airtime service → enter phone number → select amount menu → process payment → send airtime → completion message"
    },
    {
      title: "Bill Payment",
      description: "Bill payment service → select bill type menu → enter account number → enter amount → validate → pay bill → receipt"
    }
  ];

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="ai-generator-btn"
        title="Generate flow from description"
      >
        🤖 AI Generate Flow
      </button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>🤖 AI Flow Generator</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="generator-section">
                <div className="generator-description">
                  <p>Describe your USSD flow in plain English and I'll generate the complete flow structure with nodes and connections.</p>
                </div>

                <div className="form-group">
                  <label>Flow Description:</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your USSD flow... e.g., 'User enters PIN → validate → show menu with balance and transfer options → process actions → end'"
                    rows={6}
                    className="description-textarea"
                  />
                </div>

                <div className="examples-section">
                  <h4>Quick Examples:</h4>
                  <div className="examples-grid">
                    {examples.map((example, index) => (
                      <div 
                        key={index}
                        className="example-card"
                        onClick={() => setDescription(example.description)}
                      >
                        <div className="example-title">{example.title}</div>
                        <div className="example-desc">{example.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="generator-features">
                  <h4>✨ Features:</h4>
                  <ul>
                    <li>🌍 Multi-language prompts (EN, ES, FR, AR)</li>
                    <li>🔄 Smart node type detection</li>
                    <li>🎯 Auto-positioning and connections</li>
                    <li>⚡ Action template suggestions</li>
                    <li>📋 Menu option generation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={loadExample} 
                className="example-btn"
                disabled={isGenerating}
              >
                Load Example
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="cancel-btn"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerate} 
                className="generate-btn"
                disabled={isGenerating || !description.trim()}
              >
                {isGenerating ? '🔄 Generating...' : '🚀 Generate Flow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIFlowGenerator;
