import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { relativeTime } from '../time';

const NOW = new Date('2025-06-01T12:00:00Z').getTime();

beforeEach(() => { vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe('relativeTime', () => {
  it('returns "now" for timestamps under 60 seconds ago', () => {
    expect(relativeTime(ago(30_000))).toBe('now');
    expect(relativeTime(ago(0))).toBe('now');
  });

  it('returns minutes for 1–59 minutes ago', () => {
    expect(relativeTime(ago(60_000))).toBe('1m');
    expect(relativeTime(ago(45 * 60_000))).toBe('45m');
    expect(relativeTime(ago(59 * 60_000))).toBe('59m');
  });

  it('returns hours for 1–23 hours ago', () => {
    expect(relativeTime(ago(60 * 60_000))).toBe('1h');
    expect(relativeTime(ago(23 * 60 * 60_000))).toBe('23h');
  });

  it('returns days for 1–6 days ago', () => {
    expect(relativeTime(ago(24 * 60 * 60_000))).toBe('1d');
    expect(relativeTime(ago(6 * 24 * 60 * 60_000))).toBe('6d');
  });

  it('returns a formatted date for 7+ days ago', () => {
    const result = relativeTime(ago(7 * 24 * 60 * 60_000));
    expect(result).toMatch(/[A-Za-z]+\s\d+/); // e.g. "May 25"
  });
});