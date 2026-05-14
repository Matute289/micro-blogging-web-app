import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TweetCard from '../TweetCard';
import type { Tweet } from '../../api/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseTweet: Tweet = {
  id: 'abc123_1700000000000',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  text: 'Hello world from Pulse!',
  created_at: new Date().toISOString(),
};

function renderCard(props: Partial<Parameters<typeof TweetCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <TweetCard tweet={baseTweet} {...props} />
    </MemoryRouter>,
  );
}

describe('TweetCard', () => {
  it('renders tweet text', () => {
    renderCard();
    expect(screen.getByText('Hello world from Pulse!')).toBeInTheDocument();
  });

  it('shows resolved username when provided', () => {
    renderCard({ username: 'alice' });
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('falls back to truncated UUID when username is not provided', () => {
    renderCard();
    expect(screen.getByText('550e8400…')).toBeInTheDocument();
  });

  it('navigates to profile when avatar is clicked', async () => {
    renderCard({ username: 'alice' });
    await userEvent.click(screen.getByRole('button', { name: /View alice's profile/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/profile/550e8400-e29b-41d4-a716-446655440000');
  });

  it('renders image media', () => {
    const tweet = { ...baseTweet, media: [{ type: 'image' as const, url: 'https://example.com/img.png' }] };
    renderCard({ tweet });
    // alt="" marks image as decorative; query by role presentation or by src
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('renders non-image media as a link', () => {
    const tweet = { ...baseTweet, media: [{ type: 'video' as const, url: 'https://example.com/video.mp4' }] };
    renderCard({ tweet });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/video.mp4');
  });

  it('shows "now" for a freshly created tweet', () => {
    renderCard();
    expect(screen.getByText('now')).toBeInTheDocument();
  });
});