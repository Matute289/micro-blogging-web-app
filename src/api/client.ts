const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(_authToken ? { 'Authorization': `Bearer ${_authToken}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export function wsBaseUrl(base = BASE_URL): string {
  if (/^https?:\/\//.test(base)) {
    return base.replace(/^http/, 'ws');
  }
  // Relative base (e.g. VITE_API_URL=/api): use window.location for protocol + host
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${base}`;
  }
  return `ws://localhost:8080${base}`;
}

