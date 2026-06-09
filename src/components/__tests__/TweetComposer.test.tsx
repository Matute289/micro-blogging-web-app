import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TweetComposer from '../TweetComposer';
import * as tweetsApi from '../../api/tweets';
import type { Tweet } from '../../api/types';

vi.mock('../../api/tweets');

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'alice',
  created_at: '2024-01-01T00:00:00Z',
  last_seen_at: '2024-01-01T00:00:00Z',
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockTweet: Tweet = {
  id: 'new_1700000000000',
  user_id: mockUser.id,
  text: 'Test tweet',
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.mocked(tweetsApi.postTweet).mockResolvedValue(mockTweet);
});
afterEach(() => vi.clearAllMocks());

describe('TweetComposer', () => {
  it('renders textarea and submit button', () => {
    render(<TweetComposer onPosted={() => {}} />);
    expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pulse/i })).toBeInTheDocument();
  });

  it('submit button is disabled when textarea is empty', () => {
    render(<TweetComposer onPosted={() => {}} />);
    expect(screen.getByRole('button', { name: /Pulse/i })).toBeDisabled();
  });

  it('submit button enables after typing text', async () => {
    render(<TweetComposer onPosted={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'Hello!');
    expect(screen.getByRole('button', { name: /Pulse/i })).toBeEnabled();
  });

  it('calls postTweet and onPosted with the new tweet on submit', async () => {
    const onPosted = vi.fn();
    render(<TweetComposer onPosted={onPosted} />);
    await userEvent.type(screen.getByRole('textbox'), 'Test tweet');
    await userEvent.click(screen.getByRole('button', { name: /Pulse/i }));
    await waitFor(() => {
      expect(tweetsApi.postTweet).toHaveBeenCalledWith('Test tweet');
      expect(onPosted).toHaveBeenCalledWith(mockTweet);
    });
  });

  it('clears textarea after successful post', async () => {
    render(<TweetComposer onPosted={() => {}} />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello!');
    await userEvent.click(screen.getByRole('button', { name: /Pulse/i }));
    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('shows remaining character count', async () => {
    render(<TweetComposer onPosted={() => {}} />);
    expect(screen.getByText('280')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'Hello');
    expect(screen.getByText('275')).toBeInTheDocument();
  });

  it('shows warning class when approaching limit', async () => {
    render(<TweetComposer onPosted={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'a'.repeat(225));
    const counter = screen.getByText('55');
    expect(counter.className).toContain('warning');
  });

  it('does not submit when text is only whitespace', async () => {
    render(<TweetComposer onPosted={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), '   ');
    expect(screen.getByRole('button', { name: /Pulse/i })).toBeDisabled();
  });

  it('shows error message when post fails', async () => {
    vi.mocked(tweetsApi.postTweet).mockRejectedValueOnce(new Error('network error'));
    render(<TweetComposer onPosted={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'test');
    await userEvent.click(screen.getByRole('button', { name: /Pulse/i }));
    await waitFor(() => expect(screen.getByText(/Failed to post/i)).toBeInTheDocument());
  });

  it('clears error on next input change', async () => {
    vi.mocked(tweetsApi.postTweet).mockRejectedValueOnce(new Error('network error'));
    render(<TweetComposer onPosted={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'test');
    await userEvent.click(screen.getByRole('button', { name: /Pulse/i }));
    await waitFor(() => screen.getByText(/Failed to post/i));
    await userEvent.type(screen.getByRole('textbox'), '!');
    expect(screen.queryByText(/Failed to post/i)).not.toBeInTheDocument();
  });

  it('submits on Ctrl+Enter keyboard shortcut', async () => {
    const onPosted = vi.fn();
    render(<TweetComposer onPosted={onPosted} />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Keyboard shortcut test');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(tweetsApi.postTweet).toHaveBeenCalled());
  });
});
