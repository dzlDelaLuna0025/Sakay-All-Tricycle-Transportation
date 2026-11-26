import React from 'react';

const pesos = (value) => `₱${Number(value || 0).toFixed(2)}`;
// hahahaha

function FareTaxStatus({ quote, paymentStatus }) {
  if (!quote) {
    return (
      <div className="fare-card fare-empty">
        <i className="bi bi-receipt" />
        <p>Select a pickup and destination to see the estimated fare.</p>
      </div>
    );
  }

  return (
    <div className="fare-card">
      <div className="fare-heading">
        <div>
          <span className="eyebrow">FARE SUMMARY</span>
          <h3>{pesos(quote.totalFare)}</h3>
        </div>
        <span className={`payment-pill ${(paymentStatus || quote.paymentStatus) === 'Paid (Simulated)' ? 'paid' : ''}`}>
          {paymentStatus || quote.paymentStatus || 'Unpaid'}
        </span>
      </div>
      <div className="fare-route">
        <span>{quote.pickup}</span>
        <i className="bi bi-arrow-right" />
        <span>{quote.destination}</span>
      </div>
      <dl className="fare-breakdown">
        <div><dt>Base fare</dt><dd>{pesos(quote.baseFare)}</dd></div>
        <div><dt>Distance</dt><dd>{quote.distanceKm} km</dd></div>
        <div><dt>Distance charge</dt><dd>{pesos(quote.distanceCharge)}</dd></div>
        <div><dt>Tax / additional fee</dt><dd>{pesos(quote.tax)}</dd></div>
        <div className="fare-total"><dt>Estimated total</dt><dd>{pesos(quote.totalFare)}</dd></div>
      </dl>
      <p className="fare-disclaimer">
        Demo estimate: ₱50 base + ₱10/km. Not an official Kalibo fare. Payment is simulated; no real transaction occurs.
      </p>
    </div>
  );
}

export default FareTaxStatus;
