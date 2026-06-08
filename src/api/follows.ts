import { apiFetch } from './client';

export function followUser(_currentUserId: string, targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'POST',
  });
}

export function unfollowUser(_currentUserId: string, targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'DELETE',
  });
}
