import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import * as usersApi from '../../api/users';
import { ApiError } from '../../api/client';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../api/users');
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, login: mockLogin, logout: vi.fn() }),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const newUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'newuser',
  created_at: '2024-01-01T00:00:00Z',
  last_seen_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

function renderLogin() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage — create account flow', () => {
  it('renders logo and username input', () => {
    renderLogin();
    expect(screen.getByText('Pulse')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it('Continue button is disabled when input is empty', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
  });

  it('creates account and navigates to /home on success', async () => {
    vi.mocked(usersApi.createUser).mockResolvedValue(newUser);
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'newuser');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith('newuser');
      expect(mockLogin).toHaveBeenCalledWith(newUser);
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });

  it('transitions to login-with-id mode on 409 conflict', async () => {
    vi.mocked(usersApi.createUser).mockRejectedValue(new ApiError(409, 'username already taken'));
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'takenuser');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => {
      // The h1 says "Username taken"
      expect(screen.getByRole('heading', { name: /Username taken/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    });
  });

  it('shows error message on unexpected API failure', async () => {
    vi.mocked(usersApi.createUser).mockRejectedValue(new ApiError(500, 'internal server error'));
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'anyuser');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await waitFor(() => expect(screen.getByText(/internal server error/i)).toBeInTheDocument());
  });
});

describe('LoginPage — login with User ID flow', () => {
  async function reachIdScreen() {
    vi.mocked(usersApi.createUser).mockRejectedValue(new ApiError(409, 'username already taken'));
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'takenuser');
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByLabelText(/user id/i);
  }

  it('logs in successfully with a valid UUID', async () => {
    vi.mocked(usersApi.getUser).mockResolvedValue({ ...newUser, username: 'takenuser' });
    await reachIdScreen();
    await userEvent.type(screen.getByLabelText(/user id/i), newUser.id);
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => {
      expect(usersApi.getUser).toHaveBeenCalledWith(newUser.id);
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });

  it('shows error when UUID is not found', async () => {
    vi.mocked(usersApi.getUser).mockRejectedValue(new ApiError(404, 'not found'));
    await reachIdScreen();
    await userEvent.type(screen.getByLabelText(/user id/i), 'bad-uuid');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => expect(screen.getByText(/User ID not found/i)).toBeInTheDocument());
  });

  it('back button returns to username form', async () => {
    await reachIdScreen();
    await userEvent.click(screen.getByRole('button', { name: /different username/i }));
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });
});
