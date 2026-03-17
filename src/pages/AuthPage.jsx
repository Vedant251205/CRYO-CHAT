import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function AuthPage() {
  const { register, login } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await register(form.username.trim(), form.password);
        addToast('Account created! Welcome to CryoChat 🎉', 'success');
      } else {
        await login(form.username.trim(), form.password);
        addToast('Welcome back!', 'success');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">❄️</div>
          <h1>CryoChat</h1>
          <p>Real-time, room-based encrypted chat</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              name="username"
              type="text"
              placeholder="cooluser_42"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            id={mode === 'register' ? 'register-btn' : 'login-btn'}
            className="btn btn-primary w-full"
            type="submit"
            disabled={loading}
            style={{ padding: '12px', fontSize: '0.95rem' }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don&apos;t have an account?
              <button id="switch-to-register" onClick={() => { setMode('register'); setError(''); }}>
                Register
              </button>
            </>
          ) : (
            <>Already have an account?
              <button id="switch-to-login" onClick={() => { setMode('login'); setError(''); }}>
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
