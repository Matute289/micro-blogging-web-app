import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGitHub } from '../api/auth';

export default function GitHubCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_state'); // consume immediately

    if (!code || called.current) return;

    // State mismatch → possible CSRF; reject
    if (!savedState || state !== savedState) {
      navigate('/login?error=github_state_mismatch', { replace: true });
      return;
    }

    called.current = true;

    loginWithGitHub(code)
      .then(({ token, user }) => {
        login(token, user);
        navigate('/home', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=github_failed', { replace: true });
      });
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <p>Signing you in…</p>
    </div>
  );
}
