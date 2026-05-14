import { useState } from 'react';
import { followUser, unfollowUser } from '../api/follows';

const storageKey = (followerId: string) => `pulse_follows_${followerId}`;

function loadFollowedSet(followerId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(followerId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveFollowedSet(followerId: string, set: Set<string>) {
  localStorage.setItem(storageKey(followerId), JSON.stringify([...set]));
}

export function useFollowToggle(
  currentUserId: string | undefined,
  targetUserId: string | undefined,
) {
  const [following, setFollowing] = useState(() => {
    if (!currentUserId || !targetUserId) return false;
    return loadFollowedSet(currentUserId).has(targetUserId);
  });
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!currentUserId || !targetUserId) return;
    setLoading(true);
    try {
      const set = loadFollowedSet(currentUserId);
      if (following) {
        await unfollowUser(currentUserId, targetUserId);
        set.delete(targetUserId);
        setFollowing(false);
      } else {
        await followUser(currentUserId, targetUserId);
        set.add(targetUserId);
        setFollowing(true);
      }
      saveFollowedSet(currentUserId, set);
    } finally {
      setLoading(false);
    }
  }

  return { following, loading, toggle };
}
