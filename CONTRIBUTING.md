# Contributing

## Adding a New State

### 1. Find the camera data source

Look for a public JSON/GeoJSON API from the state's DOT or 511 system. Common patterns:

- **Iteris-powered states** (GA, NC, SC, VA): `https://{domain}/api/v2/get/cameras` or GeoJSON feeds
- **Custom DOT systems** (DE): Direct JSON endpoints like `https://tmc.deldot.gov/json/videocamera.json`
- **511 sites**: Check `{domain}/developers/doc` for API documentation

### 2. Normalize the camera data

Create a script to fetch and normalize into the `Camera[]` format:

```json
{
  "id": "UNIQUE_ID",
  "name": "Human readable name",
  "description": "Name (County/Region)",
  "route": "Route or road name",
  "direction": "N/S/E/W or empty",
  "jurisdiction": "County or region",
  "lat": 38.990931,
  "lng": -75.448625,
  "image_url": "https://direct-image-url.jpg or empty",
  "video_url": "https://hls-stream.m3u8 or empty",
  "active": true
}
```

Save to `public/data/{state_id}.json`.

#### Example: Delaware normalization script

```bash
curl -s "https://tmc.deldot.gov/json/videocamera.json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
cameras = []
for cam in data['videoCameras']:
    if not cam['enabled'] or cam['status'] != 'Active':
        continue
    title = cam['title']
    route = title.split(' @ ')[0] if ' @ ' in title else ''
    cameras.append({
        'id': cam['id'],
        'name': title,
        'description': f\"{title} ({cam['county']} County)\",
        'route': route,
        'direction': '',
        'jurisdiction': cam['county'],
        'lat': cam['lat'],
        'lng': cam['lon'],
        'image_url': '',
        'video_url': cam['urls']['m3u8s'],
        'active': True
    })
with open('public/data/de.json', 'w') as f:
    json.dump(cameras, f)
print(f'Wrote {len(cameras)} cameras')
"
```

### 3. Generate the state SVG outline

Fetch from the public US states GeoJSON and scale to a small viewBox:

```bash
python3 -c "
import json, urllib.request

url = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
data = json.loads(urllib.request.urlopen(url).read())

STATE_NAME = 'Delaware'  # Change this

for feature in data['features']:
    if feature['properties']['name'] == STATE_NAME:
        coords = feature['geometry']['coordinates'][0]
        if isinstance(coords[0][0], list):
            coords = coords[0]

        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)

        width = max_lon - min_lon
        height = max_lat - min_lat
        aspect = height / width
        vb_w = 30
        vb_h = round(vb_w * aspect)

        step = max(1, len(coords) // 40)
        simplified = coords[::step]

        points = []
        for lon, lat in simplified:
            x = round((lon - min_lon) / width * vb_w, 2)
            y = round((max_lat - lat) / height * vb_h, 2)
            points.append((x, y))

        path = f'M{points[0][0]} {points[0][1]}'
        for x, y in points[1:]:
            path += f' L{x} {y}'
        path += ' Z'

        print(f\"viewBox: '0 0 {vb_w} {vb_h}'\")
        print(f\"d: '{path}'\")
        break
"
```

### 4. Add to `src/lib/cameras.ts`

Add an entry to the `STATES` array:

```typescript
{
  id: 'de',
  name: 'Delaware',
  dataFile: 'data/de.json',
  parser: parseNormalized,
  defaultCenter: { lat: 39.0, lng: -75.5 },
  defaultZoom: 9,
  supportsVideo: true,  // true if video_url is populated
  cameraCount: 351,
}
```

- Use `parseNormalized` for pre-processed `Camera[]` JSON
- Use `parseSC` for GeoJSON format (like SC and VA)
- `defaultCenter` should center on the state's camera cluster
- `defaultZoom` should show most cameras without being too zoomed out (7-9 typically)

### 5. Add SVG path to `src/components/StateSelector.tsx`

Add to the `STATE_PATHS` object using the output from step 3:

```typescript
de: {
  viewBox: '0 0 30 56',
  d: 'M15.11 1.11 L11.33 6.0 ...',
},
```

### 6. Refreshing camera data

Camera data is static JSON committed to the repo. To refresh:

1. Re-run the normalization script from step 2
2. Update `cameraCount` in the STATES config if it changed
3. Commit the updated JSON file

## Current States

| ID | State | Source | Auth | Mode |
|----|-------|--------|------|------|
| sc | South Carolina | 511sc.org GeoJSON | None | Video + Image |
| ga | Georgia | 511ga.org API | Free key | Image only |
| nc | North Carolina | drivenc.gov API | Free key | Image only |
| va | Virginia | 511virginia GeoJSON | None | Video + Image |
| de | Delaware | tmc.deldot.gov JSON | None | Video (HLS) |
