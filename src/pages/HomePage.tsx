import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from '../api/users';
import { useTimelineSocket } from '../hooks/useTimelineSocket';
import type { Tweet } from '../api/types';
import TweetCard from '../components/TweetCard';
import TweetComposer from '../components/TweetComposer';
import BottomNav from '../components/BottomNav';
import './HomePage.css';

async function resolveUsernames(
  newTweets: Tweet[],
  existing: Map<string, string>,
): Promise<Map<string, string>> {
  const unknownIds = [...new Set(newTweets.map(t => t.user_id))].filter(
    id => !existing.has(id),
  );
  if (unknownIds.length === 0) return existing;
  const results = await Promise.allSettled(unknownIds.map(id => getUser(id)));
  const updated = new Map(existing);
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') updated.set(unknownIds[i], r.value.username);
  });
  return updated;
}

export default function HomePage() {
  const { user } = useAuth();
  const { tweets, connected, error, prependTweet } = useTimelineSocket(user?.id ?? null);
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user || tweets.length === 0) return;
    const seed = new Map([[user.id, user.username]]);
    resolveUsernames(tweets, usernames.size > 0 ? usernames : seed).then(setUsernames);
    // usernames intentionally omitted: resolveUsernames only reads it as a starting
    // point; adding it to deps would cause an infinite loop (setUsernames → re-run).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweets]);

  function handlePosted(tweet: Tweet) {
    prependTweet(tweet);
    if (user) setUsernames(prev => new Map(prev).set(user.id, user.username));
  }

  const loading = !connected && tweets.length === 0 && !error;

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
        ) : error ? (
          <div className="home-error">{error}</div>
        ) : tweets.length === 0 ? (
          <div className="home-empty">
            <span className="home-empty-icon">🐣</span>
            <p className="home-empty-title">Your timeline is empty</p>
            <p className="home-empty-sub">
              Follow people in the Explore tab to see their pulses here.
            </p>
          </div>
        ) : (
          tweets.map(t => (
            <TweetCard key={t.id} tweet={t} username={usernames.get(t.user_id)} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
