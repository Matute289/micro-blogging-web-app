import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from '../api/users';
import { getUserTweets } from '../api/tweets';
import { ApiError } from '../api/client';
import { useFollowToggle } from '../hooks/useFollowToggle';
import type { User, Tweet } from '../api/types';
import TweetCard from '../components/TweetCard';
import BottomNav from '../components/BottomNav';
import { avatarColor } from '../utils/avatar';
import './ProfilePage.css';

const PAGE_SIZE = 20;

export default function ProfilePage() {
  const { userId: paramId } = useParams<{ userId: string }>();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const targetId = paramId === 'me' ? currentUser?.id : paramId;
  const isOwnProfile = targetId === currentUser?.id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchMoreRef = useRef<() => void>(() => {});

  const { following, loading: followLoading, toggle: handleFollow } = useFollowToggle(
    currentUser?.id,
    targetId,
  );

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    setError('');
    Promise.all([
      getUser(targetId),
      getUserTweets(targetId, { limit: PAGE_SIZE }),
    ])
      .then(([u, t]) => {
        setProfileUser(u);
        setTweets(t);
        setHasMore(t.length === PAGE_SIZE);
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) {
          setError('User not found.');
        } else {
          setError('Failed to load profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [targetId]);

  async function fetchMore() {
    if (!targetId || loadingMore || !hasMore) return;
    const cursor = tweets[tweets.length - 1]?.id;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await getUserTweets(targetId, { limit: PAGE_SIZE, before: cursor });
      setTweets(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { fetchMoreRef.current = fetchMore; });

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchMoreRef.current(); },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  }

  const color = targetId ? avatarColor(targetId) : '#555';
  const initial = profileUser?.username[0].toUpperCase() ?? '?';

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="profile-back-btn" onClick={goBack} aria-label="Go back">←</button>
        <span className="profile-header-title">
          {profileUser ? `@${profileUser.username}` : 'Profile'}
        </span>
      </header>

      {loading ? (
        <div className="profile-loading"><div className="spinner" /></div>
      ) : error ? (
        <div className="profile-error">{error}</div>
      ) : profileUser && (
        <>
          <div className="profile-hero">
            <div className="profile-avatar" style={{ background: color }}>{initial}</div>
            <div className="profile-info">
              <div className="profile-username">{profileUser.username}</div>
              <div className="profile-handle">@{profileUser.username.toLowerCase()}</div>
              <div className="profile-id">{profileUser.id}</div>
            </div>
            {!isOwnProfile && (
              <div className="profile-actions">
                <button
                  className={`profile-follow-btn ${following ? 'unfollow' : 'follow'}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            )}
            {isOwnProfile && (
              <button className="profile-logout-btn" onClick={logout} type="button">
                Sign out
              </button>
            )}
          </div>

          <div className="profile-feed">
            {tweets.length === 0 ? (
              <div className="profile-empty">No pulses yet.</div>
            ) : (
              tweets.map(t => (
                <TweetCard key={t.id} tweet={t} username={profileUser.username} />
              ))
            )}
            <div ref={sentinelRef} />
            {loadingMore && <div className="profile-loading"><div className="spinner" /></div>}
            {!hasMore && tweets.length > 0 && (
              <p className="profile-end">all pulses loaded</p>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
