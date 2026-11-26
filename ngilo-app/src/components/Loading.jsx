import React from 'react';

function Loading({ label = 'Loading your information…', compact = false }) {
  return (
    <div className={`loading-state ${compact ? 'loading-compact' : ''}`} role="status">
      <span className="spinner-border" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default Loading;
