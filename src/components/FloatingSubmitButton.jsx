import React from 'react';
import './FloatingSubmitButton.css';

const FloatingSubmitButton = ({ 
  isVisible, 
  onSubmit, 
  baseGraph 
}) => {
  console.log('🎯 FloatingSubmitButton render - isVisible:', isVisible, 'baseGraph:', baseGraph?.metadata?.name);
  
  if (!isVisible) return null;

  return (
    <div className="floating-submit-container">
      <div className="floating-submit-bubble">
        <div className="bubble-content">
          <div className="bubble-icon">✏️</div>
          <div className="bubble-text">
            <strong>Editing: {baseGraph?.metadata?.name}</strong>
            <span>Version {baseGraph?.metadata?.version} → {baseGraph?.metadata?.version?.split('.').map((v, i) => i === 1 ? parseInt(v) + 1 : v).join('.')}</span>
          </div>
        </div>
        <button 
          className="floating-submit-btn"
          onClick={onSubmit}
          title="Submit changes for review"
        >
          📤 Submit for Review
        </button>
      </div>
    </div>
  );
};

export default FloatingSubmitButton;
