import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = ({ apiRequest }) => {
  const [form, setForm] = useState({ fullName: '', username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!form.username.trim() || !form.password) {
      setError('Username and password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and Confirm Password must match.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/signup', {
        method: 'POST',
        body: {
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password,
        },
      });
      navigate('/', { state: { registered: true, username: form.username.trim() } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <span className="brand-mark large"><i className="bi bi-pin-map-fill" /></span>
          <span className="brand-kicker">PASSENGER REGISTRATION</span>
        </div>
        <div className="auth-brand-copy">
          <p className="auth-script">Your next ride starts here.</p>
          <h1>JOIN<br /><span>SAKAY ALL</span></h1>
          <p>Create a local passenger account and manage your Kalibo tricycle rides in one place.</p>
        </div>
        <div className="auth-service-list">
          <span><i className="bi bi-shield-check" /> Passwords are securely hashed</span>
          <span><i className="bi bi-database-check" /> Accounts persist in SQLite</span>
        </div>
        <small>Local demonstration · No external accounts</small>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">CREATE ACCOUNT</span>
          <h2>Passenger details</h2>
          <p className="auth-subtitle">Fill in all four fields. No complicated password rules.</p>
          {error && <div className="alert alert-danger" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleSignup} className="auth-form">
            <label htmlFor="register-name">Full Name</label>
            <div className="input-with-icon">
              <i className="bi bi-person-badge" />
              <input id="register-name" type="text" value={form.fullName} onChange={update('fullName')} placeholder="e.g. Maria Dela Cruz" autoComplete="name" autoFocus />
            </div>

            <label htmlFor="register-username">Username</label>
            <div className="input-with-icon">
              <i className="bi bi-person" />
              <input id="register-username" type="text" value={form.username} onChange={update('username')} placeholder="Choose a username" autoComplete="username" />
            </div>

            <div className="form-row">
              <div>
                <label htmlFor="register-password">Password</label>
                <div className="input-with-icon">
                  <i className="bi bi-key" />
                  <input id="register-password" type="password" value={form.password} onChange={update('password')} placeholder="Password" autoComplete="new-password" />
                </div>
              </div>
              <div>
                <label htmlFor="register-confirm">Confirm Password</label>
                <div className="input-with-icon">
                  <i className="bi bi-key-fill" />
                  <input id="register-confirm" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" />
                </div>
              </div>
            </div>

            <button className="btn btn-navy auth-submit" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm" /> Creating account…</> : <>Create Account <i className="bi bi-arrow-right" /></>}
            </button>
          </form>

          <p className="auth-switch">Already registered? <Link to="/">Back to Sign In</Link></p>
          <p className="validation-note"><i className="bi bi-info-circle" /> One character is enough for both username and password. Empty values and mismatched confirmation are not accepted.</p>
        </div>
      </section>
    </main>
  );
};

export default Register;
