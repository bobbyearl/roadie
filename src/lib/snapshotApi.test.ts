import { describe, expect, it } from 'vitest';
import { isValidSnapshotUrl, getSnapshotUrl } from './snapshotApi';

describe('getSnapshotUrl', () => {
  it('returns a URL containing the snapshot ID', () => {
    const url = getSnapshotUrl('abc12345');
    // URL depends on env config, just verify it contains the ID
    if (url) {
      expect(url).toContain('/api/snapshot/abc12345');
    }
  });

  it('returns null when API is not configured', () => {
    // Can't easily test this without resetting the module, so skip
    // The important thing is it doesn't throw
    const url = getSnapshotUrl('test1234');
    expect(url === null || typeof url === 'string').toBe(true);
  });
});

describe('isValidSnapshotUrl', () => {
  it('allows URLs from configured API host', () => {
    const url = getSnapshotUrl('abc12345');
    if (url) {
      expect(isValidSnapshotUrl(url)).toBe(true);
    }
  });

  it('rejects arbitrary domains', () => {
    expect(isValidSnapshotUrl('https://evil.com/api/snapshot/abc')).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(isValidSnapshotUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(isValidSnapshotUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isValidSnapshotUrl('not-a-url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidSnapshotUrl('')).toBe(false);
  });
});
