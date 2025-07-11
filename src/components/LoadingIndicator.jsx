import React from 'react';
import iconSpinner from '../svg/spinner-icon.svg?raw';

const LoadingIndicator = ({ label = '' }) => {
  return (
    <p data-testid="loading-indicator" aria-label={label} className="loading-indicator">
      <span dangerouslySetInnerHTML={{ __html: iconSpinner }} />
      <span>{label}</span>
    </p>
  );
};

export default LoadingIndicator;