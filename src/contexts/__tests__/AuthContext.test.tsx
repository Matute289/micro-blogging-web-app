import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../api/client', () => ({ setAuthToken: vi.fn() }));

const STORAGE_KEY = 'pulse_auth';

const stubUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'alice',
  created_at: '2024-01-01T00:00:00Z',
  last_seen_at: '2024-01-01T00:00:00Z',
};

// A fake JWT with an exp 1 hour in the future
function makeFakeToken(): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `header.${payload}.sig`;
}

const stubToken = makeFakeToken();

// vitest 4.x jsdom has an issue with localStorage.clear() — mock the storage instead
const localStorageStore: Record<string, string> = {};
const localStorageMock: Storage = {
  length: 0,
  key: () => null,
  getItem: (k) => localStorageStore[k] ?? null,
  setItem: (k, v) => { localStorageStore[k] = v; },
  removeItem: (k) => { delete localStorageStore[k]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

function TestConsumer() {
  const { user, token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login(stubToken, stubUser)}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderWithAuth(initialStorage?: object) {
  if (initialStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStorage));
  }
  return render(<AuthProvider><TestConsumer /></AuthProvider>);
}

describe('AuthContext', () => {
  it('starts with no user when localStorage is empty', () => {
    renderWithAuth();
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('sets user and token after login', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(screen.getByTestId('username')).toHaveTextContent('alice');
    expect(screen.getByTestId('token')).toHaveTextContent(stubToken);
  });

  it('persists token and user to localStorage on login', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.user.username).toBe('alice');
    expect(stored.user.id).toBe(stubUser.id);
    expect(stored.token).toBe(stubToken);
    expect(typeof stored.exp).toBe('number');
  });

  it('clears user and token on logout', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('removes localStorage key on logout', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores user and token from localStorage on mount when token is valid', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ exp }));
    const token = `header.${payload}.sig`;
    const initialStorage = { token, user: { ...stubUser, username: 'bob' }, exp };
    renderWithAuth(initialStorage);
    // useEffect runs asynchronously — wait for state to settle
    expect(await screen.findByTestId('username')).toHaveTextContent('bob');
    expect(screen.getByTestId('token')).toHaveTextContent(token);
  });

  it('does not restore expired token from localStorage', async () => {
    const exp = Math.floor(Date.now() / 1000) - 1; // expired 1 second ago
    const payload = btoa(JSON.stringify({ exp }));
    const token = `header.${payload}.sig`;
    const initialStorage = { token, user: stubUser, exp };
    renderWithAuth(initialStorage);
    // Give the effect a chance to run
    await act(async () => {});
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
