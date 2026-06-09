import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimelineSocket } from '../useTimelineSocket';
import type { Tweet } from '../../api/types';

vi.mock('../../api/client', () => ({ wsBaseUrl: () => 'ws://localhost:8080' }));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  url: string;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  triggerMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  triggerClose() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

const makeTweet = (id: string): Tweet => ({
  id,
  user_id: 'user-1',
  text: 'hello',
  created_at: new Date().toISOString(),
});

describe('useTimelineSocket', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not connect when token is null', () => {
    renderHook(() => useTimelineSocket(null));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('connects with the correct URL', () => {
    renderHook(() => useTimelineSocket('eyJhbGc'));
    expect(FakeWebSocket.instances[0].url).toBe(
      'ws://localhost:8080/ws/timeline?token=eyJhbGc',
    );
  });

  it('sets connected=true on WebSocket open', () => {
    const { result } = renderHook(() => useTimelineSocket('token-abc'));
    expect(result.current.connected).toBe(false);
    act(() => { FakeWebSocket.instances[0].triggerOpen(); });
    expect(result.current.connected).toBe(true);
  });

  it('populates tweets on "timeline" message', () => {
    const tweets = [makeTweet('t1'), makeTweet('t2')];
    const { result } = renderHook(() => useTimelineSocket('token-abc'));
    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
      FakeWebSocket.instances[0].triggerMessage({ type: 'timeline', data: tweets });
    });
    expect(result.current.tweets).toHaveLength(2);
    expect(result.current.tweets[0].id).toBe('t1');
  });

  it('prepends tweet on real-time "tweet" message', () => {
    const { result } = renderHook(() => useTimelineSocket('token-abc'));
    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
      FakeWebSocket.instances[0].triggerMessage({ type: 'timeline', data: [makeTweet('t1')] });
      FakeWebSocket.instances[0].triggerMessage({ type: 'tweet', data: makeTweet('t2') });
    });
    expect(result.current.tweets[0].id).toBe('t2');
    expect(result.current.tweets[1].id).toBe('t1');
  });

  it('prependTweet adds a tweet optimistically', () => {
    const { result } = renderHook(() => useTimelineSocket('token-abc'));
    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
      FakeWebSocket.instances[0].triggerMessage({ type: 'timeline', data: [makeTweet('t1')] });
    });
    act(() => { result.current.prependTweet(makeTweet('t-opt')); });
    expect(result.current.tweets[0].id).toBe('t-opt');
    expect(result.current.tweets[1].id).toBe('t1');
  });

  it('reconnects after disconnect with ~1s initial delay', () => {
    renderHook(() => useTimelineSocket('token-abc'));
    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
      FakeWebSocket.instances[0].triggerClose();
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(1001); });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('closes socket and cancels reconnect timer on unmount', () => {
    const { unmount } = renderHook(() => useTimelineSocket('token-abc'));
    const ws = FakeWebSocket.instances[0];
    act(() => { ws.triggerOpen(); ws.triggerClose(); });
    unmount();
    expect(ws.closed).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('sets error and stops retrying after MAX_RETRIES exhausted', () => {
    // No onAuthFailure provided: close-without-open falls through to retry/error path.
    // Drive 9 close-without-open cycles to exhaust MAX_RETRIES=8.
    const { result } = renderHook(() => useTimelineSocket('token-abc'));
    for (let i = 0; i < 9; i++) {
      act(() => { FakeWebSocket.instances[i]?.triggerClose(); });
      act(() => { vi.advanceTimersByTime(31_000); });
    }
    expect(result.current.error).toBe('Connection lost. Please refresh.');
    const countAfterError = FakeWebSocket.instances.length;
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(FakeWebSocket.instances.length).toBe(countAfterError);
  });

  it('calls onAuthFailure and does not retry when close fires without open', () => {
    const onAuthFailure = vi.fn();
    renderHook(() => useTimelineSocket('token-abc', onAuthFailure));
    act(() => { FakeWebSocket.instances[0].triggerClose(); });
    expect(onAuthFailure).toHaveBeenCalledOnce();
    // no retry timer — no new socket created
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('does not call onAuthFailure when close fires after a successful open', () => {
    const onAuthFailure = vi.fn();
    renderHook(() => useTimelineSocket('token-abc', onAuthFailure));
    act(() => {
      FakeWebSocket.instances[0].triggerOpen();
      FakeWebSocket.instances[0].triggerClose();
    });
    expect(onAuthFailure).not.toHaveBeenCalled();
    // a retry should be scheduled instead
    act(() => { vi.advanceTimersByTime(1001); });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
