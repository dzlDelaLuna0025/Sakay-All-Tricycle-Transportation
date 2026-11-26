import './App.css';
import { cloneElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Login from './pages/Login';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const user = getStoredUser();
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;

  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && user?.token && path !== '/login') {
      localStorage.removeItem('user');
      window.location.assign('/');
    }
    const error = new Error(data?.error || 'The server could not complete your request.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function RequireAuth({ children, role }) {
  const user = getStoredUser();
  if (!user?.token) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />;
  return cloneElement(children, { user });
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login apiRequest={apiRequest} />} />
        <Route path="/signup" element={<Register apiRequest={apiRequest} />} />
        <Route path="/home" element={<RequireAuth><Home apiRequest={apiRequest} /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth role="admin"><Home apiRequest={apiRequest} /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile apiRequest={apiRequest} /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
