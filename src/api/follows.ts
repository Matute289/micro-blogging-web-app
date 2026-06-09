import { apiFetch } from './client';

export function followUser(targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'POST',
  });
}

export function unfollowUser(targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'DELETE',
  });
}
