import { useNavigate } from 'react-router-dom';
import type { Tweet } from '../api/types';
import { avatarColor } from '../utils/avatar';
import { relativeTime } from '../utils/time';
import './TweetCard.css';

const MEDIA_ICONS: Record<string, string> = {
  image: '🖼',
  video: '▶',
  music: '♪',
};

interface TweetCardProps {
  tweet: Tweet;
  username?: string;
}

export default function TweetCard({ tweet, username }: TweetCardProps) {
  const navigate = useNavigate();
  const initial = (username ?? tweet.user_id)[0].toUpperCase();
  const color = avatarColor(tweet.user_id);
  const displayName = username ?? `${tweet.user_id.slice(0, 8)}…`;

  function goToProfile() {
    navigate(`/profile/${tweet.user_id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToProfile();
    }
  }

  return (
    <article className="tweet-card">
      <div
        className="tweet-avatar"
        style={{ background: color }}
        onClick={goToProfile}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View ${displayName}'s profile`}
      >
        {initial}
      </div>

      <div className="tweet-body">
        <div className="tweet-header">
          <span
            className="tweet-username"
            onClick={goToProfile}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            {displayName}
          </span>
          <span className="tweet-handle">@{displayName.toLowerCase().replace(/\s/g, '')}</span>
          <span className="tweet-time">{relativeTime(tweet.created_at)}</span>
        </div>

        <p className="tweet-text">{tweet.text}</p>

        {tweet.media && tweet.media.length > 0 && (
          <div className="tweet-media">
            {tweet.media.map((item, i) => (
              item.type === 'image' ? (
                <div key={i} className="tweet-media-item">
                  <img src={item.url} alt="" loading="lazy" />
                </div>
              ) : (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="tweet-media-link">
                  <span className="tweet-media-icon">{MEDIA_ICONS[item.type] ?? '🔗'}</span>
                  {item.url}
                </a>
              )
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
