import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTimeline } from '../api/timeline';
import { getUser } from '../api/users';
import type { Tweet } from '../api/types';
import TweetCard from '../components/TweetCard';
import TweetComposer from '../components/TweetComposer';
import BottomNav from '../components/BottomNav';
import './HomePage.css';

const PAGE_SIZE = 20;

export default function HomePage() {
  const { user } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchMoreRef = useRef<() => void>(() => {});

  async function resolveUsernames(newTweets: Tweet[], existing: Map<string, string>) {
    const unknownIds = [...new Set(newTweets.map(t => t.user_id))].filter(id => !existing.has(id));
    if (unknownIds.length === 0) return existing;
    const results = await Promise.allSettled(unknownIds.map(id => getUser(id)));
    const updated = new Map(existing);
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') updated.set(unknownIds[i], r.value.username);
    });
    return updated;
  }

  useEffect(() => {
    if (!user) return;
    const seed = new Map([[user.id, user.username]]);
    setLoading(true);

    getTimeline(user.id, { limit: PAGE_SIZE })
      .then(data => {
        setTweets(data);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
        // Resolve usernames async — second render pass fills names in
        return resolveUsernames(data, seed);
      })
      .then(resolved => setUsernames(resolved))
      .catch(() => setLoading(false));
  }, [user?.id]);

  const fetchMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;
    const cursor = tweets[tweets.length - 1]?.id;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await getTimeline(user.id, { limit: PAGE_SIZE, before: cursor });
      setTweets(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setUsernames(prev => {
        resolveUsernames(data, prev).then(setUsernames);
        return prev;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [user, tweets, loadingMore, hasMore]);

  // Keep ref pointing at latest fetchMore without reinstalling observer
  useEffect(() => { fetchMoreRef.current = fetchMore; });

  // Observer installed once — reads latest callback via ref
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchMoreRef.current(); },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  function handlePosted(tweet: Tweet) {
    setTweets(prev => [tweet, ...prev]);
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <span className="home-header-title">Pulse</span>
        <span className="home-header-user">@{user?.username}</span>
      </header>

      <div className="home-feed">
        <TweetComposer onPosted={handlePosted} />

        {loading ? (
          <div className="home-loading"><div className="spinner" /></div>
        ) : tweets.length === 0 ? (
          <div className="home-empty">
            <span className="home-empty-icon">🐣</span>
            <p className="home-empty-title">Your timeline is empty</p>
            <p className="home-empty-sub">Follow people in the Explore tab to see their pulses here.</p>
          </div>
        ) : (
          tweets.map(t => (
            <TweetCard key={t.id} tweet={t} username={usernames.get(t.user_id)} />
          ))
        )}

        {!loading && (
          <>
            <div ref={sentinelRef} />
            {loadingMore && <div className="home-loading"><div className="spinner" /></div>}
            {!hasMore && tweets.length > 0 && (
              <p className="home-end">you're all caught up</p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
