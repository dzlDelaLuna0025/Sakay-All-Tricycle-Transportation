import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Login = ({ apiRequest }) => {
  const location = useLocation();
  const [username, setUsername] = useState(location.state?.username || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      localStorage.setItem('user', JSON.stringify(data));
      navigate(data.role === 'admin' ? '/admin' : '/home');
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <span className="brand-mark large"><i className="bi bi-pin-map-fill" /></span>
          <span className="brand-kicker">KALIBO, AKLAN</span>
        </div>
        <div className="auth-brand-copy">
          <p className="auth-script">Sakay na, Kalibo!</p>
          <h1>SAKAY<br /><span>ALL</span></h1>
          <p>A simple online tricycle platform for convenient rides around Kalibo, Aklan.</p>
        </div>
        <div className="auth-service-list">
          <span><i className="bi bi-check2-circle" /> Six local service areas</span>
          <span><i className="bi bi-check2-circle" /> Simulated tricycle assignment</span>
          <span><i className="bi bi-check2-circle" /> Saved ride history</span>
        </div>
        <small>Group Three · School Project</small>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="auth-subtitle">Book a ride or manage the local dispatch board.</p>

          {location.state?.registered && (
            <div className="alert alert-success" role="status">
              <i className="bi bi-check-circle" /> Account created. You can now sign in.
            </div>
          )}
          {error && <div className="alert alert-danger" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <label htmlFor="login-username">Username</label>
            <div className="input-with-icon">
              <i className="bi bi-person" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon">
              <i className="bi bi-key" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>

            <button className="btn btn-navy auth-submit" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm" /> Signing in…</> : <>Sign In <i className="bi bi-arrow-right" /></>}
            </button>
          </form>

          <p className="auth-switch">New to Sakay All? <Link to="/signup">Create Account</Link></p>

          <div className="demo-credentials">
            <div>
              <span className="eyebrow">ADMINISTRATOR DEMO</span>
              <p>Username: <strong>admin</strong> · Password: <strong>admin</strong></p>
            </div>
            <button type="button" className="btn btn-outline-navy btn-sm" onClick={() => { setUsername('admin'); setPassword('admin'); setError(''); }}>
              Fill details
            </button>
          </div>
          <p className="validation-note">For this school demo, one-character usernames and passwords are accepted.</p>
        </div>
      </section>
    </main>
  );
};

export default Login;
