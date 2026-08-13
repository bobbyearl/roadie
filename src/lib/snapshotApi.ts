// Snapshot API client - uploads captured frames to the Worker
// Falls back to local-only mode if API is unavailable

const SNAPSHOT_API = import.meta.env.VITE_SNAPSHOT_API ?? '';

export interface UploadResult {
  id: string;
  expiresAt: number;
}

export async function uploadSnapshot(dataUrl: string): Promise<UploadResult | null> {
  if (!SNAPSHOT_API) return null;

  try {
    // Convert data URL to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const response = await fetch(`${SNAPSHOT_API}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function getSnapshotUrl(id: string): string | null {
  if (!SNAPSHOT_API) return null;
  return `${SNAPSHOT_API}/api/snapshot/${id}`;
}

// Validate a snapshot URL from a share link
const ALLOWED_HOSTS = [
  'roadie-snapshots', // matches *.workers.dev subdomain
];

export function isValidSnapshotUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow configured API host (includes localhost in dev)
    if (SNAPSHOT_API && url.startsWith(SNAPSHOT_API)) return true;
    // Allow HTTPS from known worker subdomains in production
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.workers.dev') && ALLOWED_HOSTS.some((h) => parsed.hostname.includes(h))) return true;
    return false;
  } catch {
    return false;
  }
}
