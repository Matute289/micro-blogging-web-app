import { apiFetch } from './client';
import type { User } from './types';

export function createUser(username: string): Promise<User> {
  return apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function getUser(id: string): Promise<User> {
  return apiFetch<User>(`/users/${id}`);
}
