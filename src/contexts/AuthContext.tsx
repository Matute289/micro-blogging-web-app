import { createContext, useContext, useEffect, useState } from 'react';
import { setAuthToken } from '../api/client';
import type { User } from '../api/types';

export interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const STORAGE_KEY = 'pulse_auth';

interface StoredAuth {
  token: string;
  user: User;
  exp: number;
}

function parseJwtExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

function loadStored(): { token: string; user: User } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredAuth = JSON.parse(raw);
    if (stored.exp > Date.now() / 1000) return { token: stored.token, user: stored.user };
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setUser(stored.user);
      setToken(stored.token);
      setAuthToken(stored.token);
    }
  }, []);

  function login(token: string, user: User) {
    const exp = parseJwtExp(token);
    const stored: StoredAuth = { token, user, exp };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setAuthToken(token);
    setUser(user);
    setToken(token);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setToken(null);
  }

  return <AuthContext value={{ user, token, login, logout }}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
