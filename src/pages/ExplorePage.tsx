import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from '../api/users';
import { ApiError } from '../api/client';
import { useFollowToggle } from '../hooks/useFollowToggle';
import type { User } from '../api/types';
import BottomNav from '../components/BottomNav';
import { avatarColor } from '../utils/avatar';
import './ExplorePage.css';

export default function ExplorePage() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const { following, loading: followLoading, toggle: handleFollow } = useFollowToggle(
    currentUser?.id,
    found?.id,
  );

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = query.trim();
    if (!id) return;
    setSearching(true);
    setError('');
    setFound(null);
    try {
      const u = await getUser(id);
      setFound(u);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('No user found with that ID.');
      } else {
        setError('Something went wrong. Check the ID and try again.');
      }
    } finally {
      setSearching(false);
    }
  }

  const isOwnProfile = found?.id === currentUser?.id;

  return (
    <div className="explore-page">
      <header className="explore-header">
        <span className="explore-header-title">Explore</span>
      </header>

      <div className="explore-body">
        <div>
          <p className="explore-section-title">Find people</p>
          <form onSubmit={handleSearch} className="explore-search">
            <label htmlFor="explore-id" className="sr-only">User ID</label>
            <input
              id="explore-id"
              className="explore-input"
              type="text"
              placeholder="Paste a User ID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              spellCheck={false}
            />
            <button className="explore-search-btn" type="submit" disabled={!query.trim() || searching}>
              {searching ? 'Searching…' : 'Look up'}
            </button>
          </form>
        </div>

        {error && <p className="explore-error">{error}</p>}

        {found && (
          <div className="explore-user-card">
            <div
              className="explore-user-avatar"
              style={{ background: avatarColor(found.id) }}
            >
              {found.username[0].toUpperCase()}
            </div>
            <div className="explore-user-info">
              <div className="explore-user-name">{found.username}</div>
              <div className="explore-user-id">{found.id}</div>
            </div>
            {!isOwnProfile && (
              <button
                className={`explore-follow-btn ${following ? 'unfollow' : 'follow'}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {following ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
        )}

        {!found && !error && (
          <p className="explore-hint">Enter a User ID to find and follow someone</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
