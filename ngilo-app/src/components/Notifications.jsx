import React from 'react';
import { formatRideDate } from './RideStatus';

function Notifications({ notifications, onRead, onReadAll }) {
  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACTIVITY UPDATES</span>
          <h2>Notifications</h2>
          <p>Messages created by your actual account and ride activity.</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline-navy btn-sm" type="button" onClick={onReadAll}>
            <i className="bi bi-check2-all" /> Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><i className="bi bi-bell" /></span>
          <h3>No notifications yet</h3>
          <p>Ride requests, assignments, status changes, and payments will appear here.</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notification-item ${notification.is_read ? '' : 'unread'}`}
              onClick={() => onRead(notification.id)}
              disabled={Boolean(notification.is_read)}
            >
              <span className="notification-icon"><i className={`bi ${notification.message.includes('assigned') ? 'bi-truck-front' : notification.message.includes('cancelled') ? 'bi-x-circle' : notification.message.includes('payment') ? 'bi-wallet2' : 'bi-bell'}`} /></span>
              <span className="notification-copy">
                <strong>{notification.message}</strong>
                <small>{formatRideDate(notification.created_at)}</small>
              </span>
              {!notification.is_read && <span className="unread-dot" aria-label="Unread" />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default Notifications;
