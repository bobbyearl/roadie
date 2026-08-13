# Snapshot Share Feature

## User Flow

### Creator (Rod posting to Chucktown Memes)
1. Watching cameras, sees something interesting (accident, weather, etc.)
2. Clicks **Snapshot** button on the camera card (new button in the overflow menu)
3. Current frame is captured from the `<video>` or `<img>` element to a canvas
4. A **Share Modal** opens showing:
   - The captured snapshot (preview)
   - Selected cameras list
   - "Share Link" button (copies URL to clipboard)
   - Optional: caption/title field
5. On "Share Link": snapshot image is uploaded to Cloudflare R2, short ID returned
6. Share URL is constructed: `bobbyearl.com/roadie/view/sc?cameras=x,y,z&snap=<id>`
7. URL copied to clipboard, ready to paste into Chucktown Memes/social

### Recipient (someone clicking the shared link)
1. Opens the URL
2. Sees a **split view**:
   - Left/Top: "Snapshot from 2 hours ago" - the frozen image with timestamp
   - Right/Bottom: Live feed from the same camera(s)
3. Can dismiss the snapshot to go full live view
4. Snapshot has a subtle "Captured X hours ago" label
5. After 24 hours, the snapshot URL expires - the link still works but shows only live

## Technical Design

### Client-Side Capture
```ts
function captureFrame(element: HTMLVideoElement | HTMLImageElement): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = element.videoWidth || element.naturalWidth || element.width;
  canvas.height = element.videoHeight || element.naturalHeight || element.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(element, 0, 0);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}
```

### Upload (Cloudflare R2 via Worker)
- Worker endpoint: `POST /api/snapshot` - accepts JPEG blob, returns `{ id, url, expiresAt }`
- R2 bucket with lifecycle rule: delete objects older than 30 days
- Worker validates: Content-Type is image/jpeg, size < 500KB, rate limit per IP

### URL Format
```
/view/sc?cameras=sc:abc,sc:def&snap=<8-char-id>&snapAt=<unix-timestamp>
```

### Rendering (Recipient)
- On load, check for `snap` param
- If present and valid: fetch snapshot from R2, show in comparison layout
- Validate: URL must be `https://` from allowlisted R2 domain, must end in `.jpg`
- If 404 (expired): show "Snapshot expired" with just the live view

### Security
- Allowlist snapshot host: only `pub-xxxxx.r2.dev` or custom domain
- Validate URL: HTTPS + allowlisted domain + .jpg extension
- Render as `<img>` only, never as href or innerHTML
- Worker rate limits: 10 uploads/minute per IP
- Max file size: 500KB (a 640x480 JPEG at 85% quality is ~30-60KB)

## Recipient UX (What They See)

When a recipient opens a shared link like:
`bobbyearl.com/roadie/view/sc?cameras=sc:abc,sc:def&snap=<id>&snapAt=1723456789`

### Layout
```
+--------------------------------------------------+
| Roadie App           [Bookmarks] [Share] [Browse]|
+--------------------------------------------------+
| [Snapshot banner: "Shared 2h ago - I-26 @ Exit 5"]|
+--------------------------------------------------+
|  [Snapshot image]  |  [Live feed]               |
|  "2 hours ago"     |  "Live"                    |
|  (frozen frame)    |  (real-time)               |
+--------------------------------------------------+
| [Dismiss snapshot] [Open in Roadie]             |
+--------------------------------------------------+
```

### Behavior
1. Banner at top: "Snapshot shared 2 hours ago" with camera name
2. First camera shows split: left is snapshot (static image), right is live feed
3. Other cameras in the selection show live only
4. "Dismiss" removes the snapshot comparison, shows all live
5. After 24h, snapshot returns 404: banner says "Snapshot expired", shows live only
6. Full app functionality works: they can pan, zoom, add cameras, etc.

### Phase 1 (current, no backend)
- `snap` param not yet in URL (no persistent storage)
- Share link just includes cameras - recipient sees live feeds
- Snapshot exists only in the creator's browser (download available)

### Phase 2 (with R2)
- Snapshot uploaded, ID in URL
- Recipient gets the full comparison experience
- 24h expiry with graceful degradation

## Monetization Hooks
- Sponsor banner space in the share modal
- Sponsor banner on shared snapshot view (recipient sees it)
- Affiliate link section in footer or share modal
