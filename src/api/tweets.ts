import { apiFetch } from './client';
import type { Tweet, MediaItem, PaginationParams } from './types';

export function postTweet(
  userId: string,
  text: string,
  media?: MediaItem[],
): Promise<Tweet> {
  return apiFetch<Tweet>('/tweets', {
    method: 'POST',
    userId,
    body: JSON.stringify({ text, ...(media?.length ? { media } : {}) }),
  });
}

export function getUserTweets(
  userId: string,
  params: PaginationParams = {},
): Promise<Tweet[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.before) qs.set('before', params.before);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Tweet[]>(`/users/${userId}/tweets${query}`);
}
