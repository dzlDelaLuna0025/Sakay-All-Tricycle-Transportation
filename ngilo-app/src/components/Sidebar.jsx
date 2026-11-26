import React from 'react';

const passengerLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
  { id: 'book', label: 'Book a tricycle', icon: 'bi-pin-map' },
  { id: 'rides', label: 'My rides', icon: 'bi-clock-history' },
  { id: 'notifications', label: 'Notifications', icon: 'bi-bell' },
  { id: 'profile', label: 'Profile', icon: 'bi-person' },
];

const adminLinks = [
  { id: 'admin', label: 'Overview', icon: 'bi-grid-1x2' },
  { id: 'requests', label: 'Ride requests', icon: 'bi-clipboard2-check' },
  { id: 'passengers', label: 'Passengers', icon: 'bi-people' },
  { id: 'tricycles', label: 'Tricycles', icon: 'bi-truck-front' },
  { id: 'profile', label: 'Profile', icon: 'bi-person' },
];

function Sidebar({ role, activePage, onNavigate, onLogout, unreadCount, isOpen, onClose }) {
  const links = role === 'admin' ? adminLinks : passengerLinks;

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark"><i className="bi bi-pin-map-fill" /></span>
        <div>
          <strong>SAKAY ALL</strong>
          <span>Sakay na, Kalibo!</span>
        </div>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close navigation">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <div className="sidebar-role">
        <span className="role-dot" />
        {role === 'admin' ? 'Administrator workspace' : 'Passenger workspace'}
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            className={activePage === link.id ? 'active' : ''}
            onClick={() => onNavigate(link.id)}
          >
            <i className={`bi ${link.icon}`} />
            <span>{link.label}</span>
            {link.id === 'notifications' && unreadCount > 0 && (
              <span className="nav-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="local-note">
          <i className="bi bi-laptop" />
          <span>Local school project<br />Simulated dispatch</span>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-left" /> Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
