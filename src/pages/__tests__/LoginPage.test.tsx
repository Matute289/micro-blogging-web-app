import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import * as authApi from '../../api/auth';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../api/auth');
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, token: null, login: mockLogin, logout: vi.fn() }),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});
// Mock Google and Apple SDKs
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: 'fake-google-token' })}>
      Google
    </button>
  ),
}));
vi.mock('react-apple-signin-auth', () => ({
  default: ({ render }: { render: (p: object) => React.ReactNode }) => render({}),
}));

beforeEach(() => vi.clearAllMocks());

function renderLogin() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  it('renders Pulse logo', () => {
    renderLogin();
    expect(screen.getByText('Pulse')).toBeInTheDocument();
  });

  it('renders GitHub button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('Google login calls loginWithGoogle and navigates to /home', async () => {
    const fakeResponse = {
      token: 'jwt-token',
      user: { id: 'u1', username: 'alice', created_at: '', last_seen_at: '' },
    };
    vi.mocked(authApi.loginWithGoogle).mockResolvedValue(fakeResponse);
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /google/i }));
    await waitFor(() => {
      expect(authApi.loginWithGoogle).toHaveBeenCalledWith('fake-google-token');
      expect(mockLogin).toHaveBeenCalledWith('jwt-token', fakeResponse.user);
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });

  it('shows error on Google login failure', async () => {
    vi.mocked(authApi.loginWithGoogle).mockRejectedValue(new Error('Network error'));
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /google/i }));
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });
});
