import React from 'react';

const steps = ['Pending', 'Accepted', 'Assigned', 'In Progress', 'Completed'];
const activeStatuses = ['Pending', 'Accepted', 'Assigned', 'In Progress'];

export function formatRideDate(value) {
  if (!value) return 'Not available';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function RideStatus({ ride, onCancel, onPay, actionLoading }) {
  if (!ride) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><i className="bi bi-signpost-split" /></span>
        <h3>No current ride</h3>
        <p>Your next ride request and its live database status will appear here.</p>
      </div>
    );
  }

  const currentStep = ride.status === 'Assigned' ? 2 : steps.indexOf(ride.status);
  const canCancel = activeStatuses.includes(ride.status);

  return (
    <article className="ride-status-card">
      <div className="ride-card-top">
        <div>
          <span className="eyebrow">RIDE #{ride.ride_id.slice(0, 8).toUpperCase()}</span>
          <h3>{ride.pickup} <i className="bi bi-arrow-right" /> {ride.destination}</h3>
          <p>{formatRideDate(ride.created_at)}</p>
        </div>
        <span className={`status-badge status-${ride.status.toLowerCase().replace(' ', '-')}`}>{ride.status}</span>
      </div>

      {ride.status === 'Cancelled' ? (
        <div className="cancelled-note"><i className="bi bi-x-circle" /> This ride was cancelled.</div>
      ) : (
        <div className="ride-progress" aria-label={`Ride status: ${ride.status}`}>
          {steps.map((step, index) => (
            <div key={step} className={`${index <= currentStep ? 'reached' : ''} ${step === ride.status ? 'current' : ''}`}>
              <span>{index < currentStep || ride.status === 'Completed' ? <i className="bi bi-check" /> : index + 1}</span>
              <small>{step}</small>
            </div>
          ))}
        </div>
      )}

      <div className="ride-detail-grid">
        <div>
          <span>Tricycle</span>
          <strong>{ride.plate_number || 'Waiting for assignment'}</strong>
        </div>
        <div>
          <span>Driver</span>
          <strong>{ride.driver_name || 'Not yet assigned'}</strong>
        </div>
        <div>
          <span>Estimated fare</span>
          <strong>₱{Number(ride.fare).toFixed(2)}</strong>
        </div>
        <div>
          <span>Payment</span>
          <strong>{ride.payment_status}</strong>
        </div>
      </div>

      {(onCancel || onPay) && (
        <div className="ride-actions">
          {onPay && ride.payment_status !== 'Paid (Simulated)' && ride.status !== 'Cancelled' && (
            <button className="btn btn-gold" type="button" disabled={actionLoading === `pay-${ride.ride_id}`} onClick={() => onPay(ride.ride_id)}>
              <i className="bi bi-wallet2" /> {actionLoading === `pay-${ride.ride_id}` ? 'Recording…' : 'Simulate payment'}
            </button>
          )}
          {onCancel && canCancel && (
            <button className="btn btn-outline-danger" type="button" disabled={actionLoading === `cancel-${ride.ride_id}`} onClick={() => onCancel(ride.ride_id)}>
              <i className="bi bi-x-circle" /> {actionLoading === `cancel-${ride.ride_id}` ? 'Cancelling…' : 'Cancel ride'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default RideStatus;
