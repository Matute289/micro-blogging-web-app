import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError, wsBaseUrl } from '../client';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => vi.unstubAllGlobals());

function makeResponse(status: number, body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(typeof body === 'string' ? body : body),
  } as unknown as Response;
}

describe('ApiError', () => {
  it('stores status and message', () => {
    const err = new ApiError(404, 'not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('not found');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('apiFetch', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { id: 'abc', username: 'alice' }));
    const result = await apiFetch<{ id: string; username: string }>('/users/abc');
    expect(result).toEqual({ id: 'abc', username: 'alice' });
  });

  it('throws ApiError with status on non-ok response', async () => {
    mockFetch.mockResolvedValue(makeResponse(404, 'not found'));
    await expect(apiFetch('/users/missing')).rejects.toThrow(ApiError);
  });

  it('ApiError carries the correct status code', async () => {
    mockFetch.mockResolvedValue(makeResponse(404, 'not found'));
    try {
      await apiFetch('/users/missing');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).message).toBe('not found');
    }
  });

  it('throws ApiError 409 on conflict', async () => {
    mockFetch.mockResolvedValue(makeResponse(409, 'username already taken'));
    try {
      await apiFetch('/users', { method: 'POST' });
    } catch (err) {
      expect((err as ApiError).status).toBe(409);
    }
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValue({
      ok: true, status: 204,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve(null),
    } as unknown as Response);
    const result = await apiFetch('/users/x/follow', { method: 'POST' });
    expect(result).toBeUndefined();
  });

  it('sets X-User-ID header when userId is provided', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, []));
    await apiFetch('/timeline', { userId: 'user-uuid-123' });
    const [, init] = mockFetch.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-User-ID']).toBe('user-uuid-123');
  });

  it('sets Content-Type header when body is present', async () => {
    mockFetch.mockResolvedValue(makeResponse(201, { id: 'x' }));
    await apiFetch('/users', { method: 'POST', body: JSON.stringify({ username: 'test' }) });
    const [, init] = mockFetch.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('prefixes BASE_URL to path', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, {}));
    await apiFetch('/users/test');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/users/test');
  });
});

describe('wsBaseUrl', () => {
  it('returns ws://localhost:8080 by default', () => {
    expect(wsBaseUrl()).toBe('ws://localhost:8080');
  });

  it('converts http:// to ws://', () => {
    expect(wsBaseUrl('http://example.com:8080')).toBe('ws://example.com:8080');
  });

  it('converts https:// to wss://', () => {
    expect(wsBaseUrl('https://api.example.com')).toBe('wss://api.example.com');
  });

  it('builds an absolute ws:// URL from a relative base', () => {
    // wsBaseUrl('/api') should produce ws://<window.location.host>/api
    const result = wsBaseUrl('/api');
    expect(result).toMatch(/^ws:\/\//);
    expect(result).toContain('/api');
  });
});
