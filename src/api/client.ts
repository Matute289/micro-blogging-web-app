const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { userId?: string } = {},
): Promise<T> {
  const { userId, ...init } = options;

  const headers: HeadersInit = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(userId ? { 'X-User-ID': userId } : {}),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export function wsBaseUrl(base = BASE_URL): string {
  return base.replace(/^http/, 'ws');
}

