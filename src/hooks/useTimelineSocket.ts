import { useState, useEffect, useRef, useCallback } from 'react';
import { wsBaseUrl } from '../api/client';
import type { Tweet } from '../api/types';

const MAX_RETRIES = 8;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export interface TimelineSocketState {
  tweets: Tweet[];
  connected: boolean;
  error: string | null;
  prependTweet: (tweet: Tweet) => void;
}

export function useTimelineSocket(userId: string | null): TimelineSocketState {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);

  const prependTweet = useCallback((tweet: Tweet) => {
    setTweets(prev => [tweet, ...prev]);
  }, []);

  useEffect(() => {
    if (!userId) return;
    unmounted.current = false;

    function connect() {
      if (unmounted.current) return;
      const ws = new WebSocket(`${wsBaseUrl()}/ws/timeline?user_id=${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted.current) { ws.close(); return; }
        retryCount.current = 0;
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (e: MessageEvent) => {
        if (unmounted.current) return;
        try {
          const msg = JSON.parse(e.data as string) as { type: string; data: unknown };
          if (msg.type === 'timeline') {
            setTweets(msg.data as Tweet[]);
          } else if (msg.type === 'tweet') {
            setTweets(prev => [msg.data as Tweet, ...prev]);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // onclose fires after onerror; reconnect is handled there
      };

      ws.onclose = () => {
        if (unmounted.current) return;
        setConnected(false);
        if (retryCount.current >= MAX_RETRIES) {
          setError('Connection lost. Please refresh.');
          return;
        }
        const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount.current, MAX_DELAY_MS);
        retryCount.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmounted.current = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [userId]);

  return { tweets, connected, error, prependTweet };
}
