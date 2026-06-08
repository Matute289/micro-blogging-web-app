import { apiFetch } from './client';
import type { User } from './types';

export interface AuthResponse {
  token: string;
  user: User;
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function loginWithGitHub(code: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/github', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function loginWithApple(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/apple', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}
