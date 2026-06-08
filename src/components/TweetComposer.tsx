import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { postTweet } from '../api/tweets';
import type { Tweet } from '../api/types';
import { avatarColor } from '../utils/avatar';
import './TweetComposer.css';

const MAX_CHARS = 280;

interface TweetComposerProps {
  onPosted: (tweet: Tweet) => void;
}

export default function TweetComposer({ onPosted }: TweetComposerProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const remaining = MAX_CHARS - text.length;
  const countClass = remaining <= 20 ? 'danger' : remaining <= 60 ? 'warning' : '';

  async function handleSubmit() {
    if (!text.trim() || submitting || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const tweet = await postTweet(text.trim());
      onPosted(tweet);
      setText('');
    } catch {
      setError('Failed to post. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }

  const initial = user.username[0].toUpperCase();
  const color = avatarColor(user.id);

  return (
    <div className="composer">
      <div className="composer-avatar" style={{ background: color }}>
        {initial}
      </div>
      <div className="composer-body">
        <textarea
          className="composer-textarea"
          placeholder="What's happening?"
          value={text}
          onChange={e => { setText(e.target.value); if (error) setError(''); }}
          onKeyDown={handleKey}
          maxLength={MAX_CHARS}
          rows={3}
          aria-label="Write a pulse"
        />
        {error && <p className="composer-error">{error}</p>}
        <div className="composer-footer">
          <span className={`composer-count ${countClass}`}>{remaining}</span>
          <button
            className="composer-submit"
            onClick={handleSubmit}
            disabled={!text.trim() || remaining < 0 || submitting}
          >
            {submitting ? '…' : 'Pulse'}
          </button>
        </div>
      </div>
    </div>
  );
}
