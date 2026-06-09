import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle, loginWithApple } from '../api/auth';
import type { AuthResponse } from '../api/auth';
import './LoginPage.css';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string ?? '';
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string ?? '';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAuthResponse({ token, user }: AuthResponse) {
    login(token, user);
    navigate('/home', { replace: true });
  }

  async function withLoading(fn: () => Promise<AuthResponse>) {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      await handleAuthResponse(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function onGitHubClick() {
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub sign-in is not configured.');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback/github`,
      scope: 'user:email',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <span className="login-logo">Pulse</span>
        <p className="login-tagline">micro-blogging</p>
      </div>

      <div className="login-card">
        <div>
          <h1 className="login-title">Sign in to Pulse</h1>
          <p className="login-subtitle">Choose a provider to continue.</p>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="login-providers">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (!credentialResponse.credential) {
                setError('Google sign in failed.');
                return;
              }
              withLoading(() => loginWithGoogle(credentialResponse.credential!));
            }}
            onError={() => setError('Google sign in failed.')}
            shape="rectangular"
            text="continue_with"
            width="100%"
          />

          <button
            className="login-btn login-btn-github"
            onClick={onGitHubClick}
            disabled={loading}
            type="button"
          >
            Continue with GitHub
          </button>

          {APPLE_CLIENT_ID && (
            <AppleSignin
              uiType="dark"
              authOptions={{
                clientId: APPLE_CLIENT_ID,
                redirectURI: `${window.location.origin}/auth/callback/apple`,
                scope: 'email name',
                usePopup: true,
              }}
              onSuccess={(response: { authorization?: { id_token?: string } }) => {
                const idToken = response?.authorization?.id_token;
                if (idToken) withLoading(() => loginWithApple(idToken));
                else setError('Apple sign in failed.');
              }}
              onError={() => setError('Apple sign in failed.')}
              render={(props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
                <button
                  {...props}
                  className="login-btn login-btn-apple"
                  disabled={loading || props.disabled}
                  type="button"
                >
                  Continue with Apple
                </button>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
