import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';

const Profile = ({ apiRequest, user }) => {
  const storedUser = user;
  const [fullName, setFullName] = useState(storedUser?.fullName || '');
  const [username, setUsername] = useState(storedUser?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const goBack = () => navigate(storedUser?.role === 'admin' ? '/admin' : '/home');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!fullName.trim() || !username.trim()) {
      setError('Full name and username are required.');
      return;
    }
    setLoading(true);
    try {
      const updated = await apiRequest('/profile', {
        method: 'PUT',
        body: { fullName: fullName.trim(), username: username.trim() },
      });
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updated }));
      setFullName(updated.fullName);
      setUsername(updated.username);
      setSuccess('Profile updated and saved to the local database.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="standalone-profile">
      <header className="profile-header">
        <button className="brand-button" type="button" onClick={goBack}>
          <span className="brand-mark"><i className="bi bi-pin-map-fill" /></span>
          <span><strong>SAKAY ALL</strong><small>Account settings</small></span>
        </button>
        <button className="btn btn-outline-navy" type="button" onClick={goBack}><i className="bi bi-arrow-left" /> Back to dashboard</button>
      </header>

      <section className="profile-layout">
        <div className="profile-summary">
          <span className="profile-avatar">{fullName?.charAt(0).toUpperCase() || 'S'}</span>
          <span className="eyebrow">{storedUser?.role === 'admin' ? 'ADMINISTRATOR' : 'PASSENGER'}</span>
          <h1>{fullName || storedUser?.username}</h1>
          <p>@{username}</p>
          <div className="profile-local-note"><i className="bi bi-database-check" /> Saved locally in ngilo.db</div>
        </div>

        <div className="content-card profile-form-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACCOUNT INFORMATION</span>
              <h2>Edit profile</h2>
              <p>Update your display name or unique username.</p>
            </div>
          </div>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status"><i className="bi bi-check-circle" /> {success}</div>}
          <form onSubmit={handleSubmit} className="profile-form">
            <label htmlFor="profile-name">Full Name</label>
            <input id="profile-name" className="form-control" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <label htmlFor="profile-username">Username</label>
            <input id="profile-username" className="form-control" value={username} onChange={(event) => setUsername(event.target.value)} />
            <label htmlFor="profile-role">Account role</label>
            <input id="profile-role" className="form-control" value={storedUser?.role === 'admin' ? 'Administrator' : 'Passenger'} disabled />
            <label htmlFor="profile-id">User ID</label>
            <input id="profile-id" className="form-control user-id-field" value={storedUser?.userId || ''} disabled />
            <button className="btn btn-navy" type="submit" disabled={loading}>
              {loading ? <Loading compact label="Saving…" /> : <><i className="bi bi-check2" /> Save changes</>}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Profile;
