import { describe, it, expect } from 'vitest';
import { avatarColor, avatarInitial } from '../avatar';

describe('avatarColor', () => {
  it('returns a valid hsl string', () => {
    const color = avatarColor('550e8400-e29b-41d4-a716-446655440000');
    expect(color).toMatch(/^hsl\(\d+, 50%, 42%\)$/);
  });

  it('is deterministic — same id always gives same color', () => {
    const id = 'abc123';
    expect(avatarColor(id)).toBe(avatarColor(id));
  });

  it('produces different colors for different ids', () => {
    expect(avatarColor('user-1')).not.toBe(avatarColor('user-2'));
  });

  it('hue is always in 0–359 range', () => {
    const ids = ['a', 'z', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff'];
    for (const id of ids) {
      const match = avatarColor(id).match(/hsl\((\d+)/);
      expect(match).not.toBeNull();
      const hue = parseInt(match![1], 10);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe('avatarInitial', () => {
  it('returns first character uppercased', () => {
    expect(avatarInitial('alice')).toBe('A');
    expect(avatarInitial('Bob')).toBe('B');
  });
});