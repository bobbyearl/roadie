interface Env {
  SNAPSHOTS: R2Bucket;
  ALLOWED_ORIGIN: string;
  MAX_FILE_SIZE: string;
  SNAPSHOT_TTL_HOURS: string;
}

const RATE_LIMIT = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = RATE_LIMIT.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) return true;
  recent.push(now);
  RATE_LIMIT.set(ip, recent);
  return false;
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const isAllowed = origin === allowedOrigin || origin === 'http://localhost:5173' || origin === 'http://localhost:4173';
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // POST /api/snapshot - upload a snapshot
    if (request.method === 'POST' && url.pathname === '/api/snapshot') {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      if (isRateLimited(ip)) {
        return new Response(JSON.stringify({ error: 'Rate limited. Max 10 uploads per minute.' }), {
          status: 429,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const contentType = request.headers.get('Content-Type') ?? '';
      if (!contentType.startsWith('image/jpeg')) {
        return new Response(JSON.stringify({ error: 'Only image/jpeg accepted.' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const body = await request.arrayBuffer();
      const maxSize = parseInt(env.MAX_FILE_SIZE, 10);
      if (body.byteLength > maxSize) {
        return new Response(JSON.stringify({ error: `File too large. Max ${maxSize} bytes.` }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const id = generateId();
      const key = `${id}.jpg`;
      const ttlHours = parseInt(env.SNAPSHOT_TTL_HOURS, 10);
      const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;

      await env.SNAPSHOTS.put(key, body, {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata: { expiresAt: expiresAt.toString() },
      });

      return new Response(JSON.stringify({ id, expiresAt }), {
        status: 201,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/snapshot/:id - fetch a snapshot
    if (request.method === 'GET' && url.pathname.startsWith('/api/snapshot/')) {
      const id = url.pathname.split('/').pop()?.replace('.jpg', '') ?? '';
      if (!/^[a-z0-9]{8}$/.test(id)) {
        return new Response(JSON.stringify({ error: 'Invalid snapshot ID.' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const key = `${id}.jpg`;
      const object = await env.SNAPSHOTS.get(key);

      if (!object) {
        return new Response(JSON.stringify({ error: 'Snapshot not found or expired.' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Check TTL (R2 doesn't have native lifecycle rules, so we enforce manually)
      const expiresAt = parseInt(object.customMetadata?.expiresAt ?? '0', 10);
      if (expiresAt && Date.now() > expiresAt) {
        await env.SNAPSHOTS.delete(key);
        return new Response(JSON.stringify({ error: 'Snapshot expired.' }), {
          status: 410,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return new Response(object.body, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found.' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
