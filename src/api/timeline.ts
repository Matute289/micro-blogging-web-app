import { apiFetch } from './client';
import type { Tweet, PaginationParams } from './types';

export function getTimeline(userId: string, params: PaginationParams = {}): Promise<Tweet[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.before) qs.set('before', params.before);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Tweet[]>(`/timeline${query}`, { userId });
}
