import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

const STORAGE_KEY = 'pulse_user';
const stubUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'alice',
  created_at: '2024-01-01T00:00:00Z',
  last_seen_at: '2024-01-01T00:00:00Z',
};

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
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button onClick={() => login(stubUser)}>login</button>
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
  });

  it('sets user after login', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(screen.getByTestId('username')).toHaveTextContent('alice');
  });

  it('persists user to localStorage on login', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.username).toBe('alice');
    expect(stored.id).toBe(stubUser.id);
  });

  it('clears user on logout', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  it('removes localStorage key on logout', async () => {
    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores user from localStorage on mount', () => {
    renderWithAuth({ ...stubUser, username: 'bob' });
    expect(screen.getByTestId('username')).toHaveTextContent('bob');
  });
});
