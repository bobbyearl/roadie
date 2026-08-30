/**
 * Lightweight typed wrapper around GA4's gtag.js custom events.
 *
 * GA4 already records page_view for every route change (the app encodes most
 * state in URL search params), so this covers only the interactions that never
 * change the URL: bookmarks, route selection, auto pilot, find-closest, and
 * view-mode toggles.
 *
 * track() is a safe no-op when window.gtag is unavailable (local dev, tests,
 * or an ad-blocker), so call sites never need to guard.
 */

type GtagFn = (command: 'event', eventName: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

/** Discriminated set of custom events + their param shapes. */
export type AnalyticsEvent =
  | { name: 'bookmark_created'; params: { camera_count: number; name_length: number } }
  | { name: 'bookmark_removed'; params?: never }
  | { name: 'bookmark_renamed'; params: { name_length: number } }
  | { name: 'route_selected'; params: { route_name: string; camera_count: number } }
  | { name: 'autopilot_started'; params?: never }
  | { name: 'find_closest'; params?: never }
  | { name: 'view_mode_changed'; params: { view_mode: 'map' | 'list' | 'split' } }
  | { name: 'draw_select'; params: { camera_count: number } }
  | { name: 'keyboard_shortcut'; params: { key: string } };

/**
 * Send a custom event to GA4. No-ops if gtag is not present so it is safe to
 * call unconditionally from any component or hook.
 */
export function track<E extends AnalyticsEvent>(name: E['name'], ...rest: E extends { params: infer P } ? [P] : []): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {return;}
  const params = rest[0] as Record<string, unknown> | undefined;
  try {
    window.gtag('event', name, params);
  } catch {
    // Analytics must never break the app.
  }
}
