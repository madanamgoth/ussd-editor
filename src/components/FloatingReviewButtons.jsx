import React from 'react';
import './FloatingReviewButtons.css';

const FloatingReviewButtons = ({ 
  isVisible, 
  onApprove, 
  onReject,
  graphName,
  comparisonMode,
  onToggleMode
}) => {
  console.log('🔍 FloatingReviewButtons render - isVisible:', isVisible, 'graphName:', graphName);
  
  if (!isVisible) return null;

  return (
    <div className="floating-review-buttons">
      <div className="review-buttons-container">
        <div className="review-info">
          <h4>📊 Reviewing: {graphName}</h4>
          <p>Compare the original vs edited graph</p>
        </div>
        
        <div className="comparison-toggle">
          <button 
            className={`toggle-btn ${comparisonMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => onToggleMode('side-by-side')}
          >
            ⬌ Side by Side
          </button>
          <button 
            className={`toggle-btn ${comparisonMode === 'top-bottom' ? 'active' : ''}`}
            onClick={() => onToggleMode('top-bottom')}
          >
            ⬍ Top/Bottom
          </button>
        </div>
        
        <div className="review-actions">
          <button 
            className="review-btn reject-btn"
            onClick={onReject}
          >
            ❌ Reject Changes
          </button>
          <button 
            className="review-btn approve-btn"
            onClick={onApprove}
          >
            ✅ Approve Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingReviewButtons;
