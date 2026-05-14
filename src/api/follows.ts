import { apiFetch } from './client';

export function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'POST',
    userId: currentUserId,
  });
}

export function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  return apiFetch<void>(`/users/${targetUserId}/follow`, {
    method: 'DELETE',
    userId: currentUserId,
  });
}
