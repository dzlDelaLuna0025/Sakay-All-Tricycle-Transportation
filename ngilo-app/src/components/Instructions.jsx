import React from 'react';

const steps = [
  ['Choose your route', 'Select one of the six supported pickup and destination areas.'],
  ['Review the estimate', 'Check the demonstration fare before sending your request.'],
  ['Receive an assignment', 'An available local tricycle record is assigned automatically.'],
  ['Follow saved updates', 'Your ride status and notifications come from the SQLite database.'],
];

function Instructions() {
  return (
    <section className="content-card instructions-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>From pickup to drop-off</h2>
        </div>
      </div>
      <div className="instruction-grid">
        {steps.map(([title, description], index) => (
          <div className="instruction-step" key={title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{title}</strong><p>{description}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Instructions;
