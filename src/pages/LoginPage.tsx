import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUser } from '../api/users';
import { ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

type Mode = 'username' | 'login-with-id';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('username');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    try {
      const user = await createUser(name);
      login(user);
      navigate('/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('');
        setMode('login-with-id');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const user = await getUser(id);
      login(user);
      navigate('/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("User ID not found. Make sure you copied the full ID.");
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <span className="login-logo">Pulse</span>
        <p className="login-tagline">micro-blogging</p>
      </div>

      <div className="login-card">
        {mode === 'username' ? (
          <form onSubmit={handleUsernameSubmit} style={{ display: 'contents' }}>
            <div>
              <h1 className="login-title">Get started</h1>
              <p className="login-subtitle">Enter a username to create your account or sign in.</p>
            </div>

            {error && <p className="login-error">{error}</p>}

            <div className="login-field">
              <label className="login-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="login-input"
                type="text"
                placeholder="your_handle"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                spellCheck={false}
              />
            </div>

            <button className="login-button" type="submit" disabled={!username.trim() || loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleIdSubmit} style={{ display: 'contents' }}>
            <div>
              <h1 className="login-title">Username taken</h1>
              <p className="login-subtitle">
                <strong style={{ color: 'var(--color-text)' }}>@{username}</strong> already exists.
                If it's your account, enter your User ID to sign in.
              </p>
            </div>

            <div className="login-info">
              Your User ID was shown when you first created your account. It looks like:<br />
              <strong>550e8400-e29b-41d4-a716-446655440000</strong>
            </div>

            {error && <p className="login-error">{error}</p>}

            <div className="login-field">
              <label className="login-label" htmlFor="user-id">User ID</label>
              <input
                id="user-id"
                className="login-input login-input-mono"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                autoFocus
                spellCheck={false}
              />
            </div>

            <button className="login-button" type="submit" disabled={!userId.trim() || loading}>
              {loading ? 'Verifying…' : 'Sign in'}
            </button>

            <div className="login-divider">or</div>

            <button
              type="button"
              className="login-back"
              onClick={() => { setMode('username'); setError(''); setUserId(''); }}
            >
              ← Try a different username
            </button>
          </form>
        )}
      </div>
    </div>
  );
}