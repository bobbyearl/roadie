import { type Camera } from './cameras';

/**
 * Minimal pin data for rendering map markers.
 * Inlined in HTML as window.__PINS__ - available instantly, no fetch needed.
 * Format: [lat, lng, id]
 */
export type PinData = [number, number, string];

/** Raw metadata format from meta.json */
export interface CameraMeta {
  jurisdictions: string[];
  routes: string[];
  cameras: Record<string, [string, number, number, string, string, number]>;
  // cameras[id] = [name, routeIdx, jurisdictionIdx, image_url, video_url, hasVideo]
}

/** Read inline pins from window.__PINS__ */
export function getPins(): PinData[] {
  return (window as unknown as { __PINS__: PinData[] }).__PINS__ ?? [];
}

/** Fetch metadata (names, URLs, etc.) - called eagerly on mount */
export async function fetchMeta(): Promise<CameraMeta> {
  const res = await fetch(import.meta.env.BASE_URL + 'data/meta.json');
  return res.json();
}

/** Resolve a pin + metadata into a full Camera object */
export function resolveCamera(pin: PinData, meta: CameraMeta | undefined): Camera {
  const [lat, lng, id] = pin;
  const entry = meta?.cameras[id];

  if (!entry) {
    // Metadata not loaded yet - return a stub with minimal info
    return {
      id,
      name: id,
      description: id,
      route: '',
      direction: '',
      jurisdiction: '',
      lat,
      lng,
      image_url: '',
      video_url: '',
      active: true,
      hasVideo: false,
    };
  }

  const [name, routeIdx, jurisdictionIdx, image_url, video_url, hasVideo] = entry;
  return {
    id,
    name,
    description: `${name} (${meta.jurisdictions[jurisdictionIdx]})`,
    route: meta.routes[routeIdx],
    direction: '',
    jurisdiction: meta.jurisdictions[jurisdictionIdx],
    lat,
    lng,
    image_url,
    video_url,
    active: true,
    hasVideo: hasVideo === 1,
  };
}

/** Resolve multiple pins into Camera objects */
export function resolveCameras(pins: PinData[], meta: CameraMeta | undefined): Camera[] {
  return pins.map((pin) => resolveCamera(pin, meta));
}
