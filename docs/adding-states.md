# Adding States to Roadie - Data Capture Guide

## Build Command

After adding or modifying any state data, run:

```bash
python3 scripts/build-db.py
```

This generates ALL three files the app needs:
- `public/data/cameras.db.json` (full database)
- `public/data/pins.json` (lat/lng/id for map markers)
- `public/data/meta.json` (names, URLs, metadata for camera details)

**Do NOT manually edit pins.json or meta.json.** They are generated from cameras.db.json.

Also update `src/lib/cameras.ts` STATES array with the new state entry (id, name, center, zoom, video support, camera count).

**Always add a test camera to `public/status/index.html`** for every new state. Pick one camera that's known to work and add it to the `cameras` array. Include `videoUrl` if the state supports video.

---

## Automated Approach: 511 Platform States

Most US states use the same 511 platform (by Itis/Iteris). These can be fully scraped without any browser interaction:

### How it works

1. **Coordinates:** `GET {domain}/map/mapIcons/Cameras` (needs a session cookie from hitting the map page first)
2. **Details (name, camera ID, video URL):** `GET {domain}/tooltip/Cameras/{siteId}?lang=en-US` (no auth needed)
3. **Images:** `GET {domain}/map/Cctv/{cameraId}` (no auth needed)

### States confirmed working with this pattern

| Domain | State(s) |
|--------|----------|
| 511wi.gov | WI |
| 511la.org | LA |
| nvroads.com | NV |
| 511.idaho.gov | ID |
| 511.alaska.gov | AK |
| newengland511.org | ME/VT |
| 511ga.org | GA |
| fl511.com | FL |
| ctroads.org | CT |
| 511pa.com | PA |
| udottraffic.utah.gov | UT |

### Scrape script pattern

```python
import urllib.request, http.cookiejar, re, json, gzip, time

domain = "https://511wi.gov"
state = "wi"

# Step 1: Get coordinates (needs session)
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.open(f"{domain}/map")
req = urllib.request.Request(f"{domain}/map/mapIcons/Cameras",
    headers={'X-Requested-With': 'XMLHttpRequest', 'Referer': f'{domain}/map', 'Accept-Encoding': 'gzip'})
with opener.open(req) as resp:
    raw = resp.read()
    try: text = gzip.decompress(raw).decode()
    except: text = raw.decode()
coords = json.loads(text)

# Step 2: Scrape tooltips for each siteId
site_ids = [int(i['itemId']) for i in coords['item2']]
results = []
for sid in site_ids:
    html = urllib.request.urlopen(f"{domain}/tooltip/Cameras/{sid}?lang=en-US").read().decode()
    cam_id = re.search(r'data-camera-id="(\d+)"|data-lazy="/map/Cctv/(\d+)"', html)
    name = re.search(r'data-fs-title="([^"]+)"', html)
    video = re.search(r'data-videourl="([^"]+)"', html)
    if cam_id:
        cid = cam_id.group(1) or cam_id.group(2)
        results.append({...})  # merge with coordinates
    time.sleep(0.1)

# Step 3: Save as pre-normalized JSON
# Output format: [{id: "wi:123", name: "...", lat, lng, image_url, video_url, route: "", jurisdiction: ""}]
```

### Important: Camera ID prefixing

The build script automatically prefixes camera IDs with the state code (e.g., `1089` becomes `wi:1089`). 
If your data source already includes the prefix (e.g., `wi:1089`), it won't double-prefix.
This prevents ID collisions between states that share the same numeric ID space.

## What We Need Per State

For each camera, we need:
- **lat/lng** (coordinates)
- **id** (unique identifier)
- **name** (human-readable location)
- **image_url** (static snapshot URL, if available)
- **video_url** (HLS stream URL, if available)
- **route** (road name, optional)
- **jurisdiction** (city/county, optional)

## Step-by-Step: Capturing Camera Data

### 1. Open the state's traffic camera site

Visit the 511/DOT site. The map view loads all cameras as markers.

### 2. Open DevTools Network Tab

- **Chrome/Edge:** Cmd+Option+I (Mac) or F12 (Windows) > Network tab
- Filter by **"Fetch/XHR"** (not "All") to ignore images/CSS/JS
- Check "Preserve log" if the page does multiple loads

### 3. Reload the page (or interact with the map)

Watch for large JSON responses. Look for:
- Response with hundreds/thousands of items
- Fields like `lat`, `lng`, `latitude`, `longitude`, `location`, `camera`
- A `recordsTotal` or similar count field

### 4. Identify the right request

Click each XHR response and check the Preview tab. You're looking for:
- An array of camera objects, OR
- An object with a `data` or `features` array containing cameras

### 5. Copy the response

- Click the request > **Response** tab > **Cmd+A** (select all) > **Cmd+C** (copy)
- Or right-click the request > **"Copy" > "Copy Response"**

### 6. Save to file

Save as `scripts/data-sources/{state_code}.json` in the Roadie repo.

### 7. Tell me

Share: state code, domain, number of cameras, whether it has video, and the general shape of the JSON (I'll write the parser).

---

## States to Investigate

### Texas - drivetexas.org

1. Go to: https://drivetexas.org
2. Look for map/camera view
3. In DevTools, filter XHR for "camera" or "cctv"
4. Alternative API to try in browser console:
   ```
   fetch('https://drivetexas.org/api/cameras').then(r=>r.json()).then(d=>console.log(d.length))
   ```

### California - dot.ca.gov (Caltrans)

1. Go to: https://cwwp2.dot.ca.gov/vm/iframemap.htm (CCTV map)
2. Or: https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json (known data endpoint per district)
3. Districts 1-12 have separate JSON files:
   ```
   https://cwwp2.dot.ca.gov/data/d{N}/cctv/cctvStatusD{NN}.json
   ```
   where N=1-12, NN=01-12 (zero-padded)
4. Try loading district 7 (LA area) in your browser:
   `https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json`
5. If that works, we grab all 12 districts and merge them

### Ohio - ohgo.com

1. Go to: https://www.ohgo.com
2. Look for camera layer on their map
3. In DevTools, filter XHR, look for camera/cctv responses
4. Alternative: https://publicapi.ohgo.com may have endpoints
5. Try in console:
   ```
   fetch('https://publicapi.ohgo.com/api/v1/cameras').then(r=>r.json()).then(d=>console.log(d.length))
   ```

---

## Quick Reference: Known Platform Patterns

| Platform | Data Endpoint Pattern | Image URL Pattern |
|----------|----------------------|-------------------|
| 511 Iteris (old) | `/List/GetData/Cameras?...length=99999` | `https://{domain}/map/Cctv/{id}` |
| 511 Iteris (new SPA) | Client-side, varies | Same as above |
| SkyVDN | GeoJSON from CDN | `https://{sub}.skyvdn.com/thumbs/{name}.flv.png` |
| AlgoTraffic | Custom REST API | `https://api.algotraffic.com/v4/Cameras/{id}/snapshot.jpg` |
| Caltrans | Per-district JSON | Direct JPEG URLs in data |
| CHART (MD) | GeoJSON | Direct JPEG URLs |

---

## Tips

- If the site uses a Google Map, the camera data usually loads within 2-3 seconds of page load as one big XHR
- Sort Network tab by **Size** (largest first) to find the camera data quickly
- If you see multiple small requests instead of one big one, the site may load cameras as you pan/zoom. Zoom out to trigger them all
- Some sites require accepting cookies/terms first before data loads
- If the response is >5MB, that's fine - just save it. The build script handles large files
