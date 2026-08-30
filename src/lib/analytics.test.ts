import { afterEach, describe, expect, it, vi } from 'vitest';

import { track } from './analytics';

// Tests run in a Node environment (no jsdom), so `window` is undefined by
// default. track() guards on `typeof window === 'undefined'`; we install a
// minimal shim to exercise the gtag-present path and remove it afterward.
const g = globalThis as { window?: { gtag?: (...args: unknown[]) => void } };

afterEach(() => {
  delete g.window;
  vi.restoreAllMocks();
});

describe('track', () => {
  it('no-ops when window is absent', () => {
    delete g.window;
    expect(() => track('find_closest')).not.toThrow();
  });

  it('no-ops when window exists but gtag is absent', () => {
    g.window = {};
    expect(() => track('find_closest')).not.toThrow();
  });

  it('forwards event name and params to gtag when present', () => {
    const gtag = vi.fn();
    g.window = { gtag };
    track('bookmark_created', { camera_count: 3, name_length: 8 });
    expect(gtag).toHaveBeenCalledWith('event', 'bookmark_created', { camera_count: 3, name_length: 8 });
  });

  it('sends no params for param-less events', () => {
    const gtag = vi.fn();
    g.window = { gtag };
    track('autopilot_started');
    expect(gtag).toHaveBeenCalledWith('event', 'autopilot_started', undefined);
  });

  it('swallows errors thrown by gtag', () => {
    g.window = {
      gtag: () => {
        throw new Error('boom');
      },
    };
    expect(() => track('bookmark_removed')).not.toThrow();
  });

  it('forwards draw_select with camera_count', () => {
    const gtag = vi.fn();
    g.window = { gtag };
    track('draw_select', { camera_count: 12 });
    expect(gtag).toHaveBeenCalledWith('event', 'draw_select', { camera_count: 12 });
  });

  it('forwards keyboard_shortcut with the key', () => {
    const gtag = vi.fn();
    g.window = { gtag };
    track('keyboard_shortcut', { key: 's' });
    expect(gtag).toHaveBeenCalledWith('event', 'keyboard_shortcut', { key: 's' });
  });
});
