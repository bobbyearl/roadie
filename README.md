# Roadie

Multi-state traffic camera viewer. View 16,000+ live cameras across 10 US states.

**Live:** [bobbyearl.com/roadie](https://bobbyearl.com/roadie)

## Features

- Multi-camera viewing (select and watch multiple feeds side by side)
- Interactive map with draggable camera feeds
- Curated routes for Charleston, SC commuters
- Multi-state support (SC, NC, VA, GA)
- Live video (SC, VA) and static images (NC, GA)
- Dark mode with system preference detection
- All state saved in the URL (shareable, bookmarkable)
- Auto-retry on unstable feeds with exponential backoff

## Stack

- React 19, TypeScript, Vite
- TanStack Router (file-based, URL state)
- TanStack Query (async data loading)
- Google Maps (Advanced Markers, draggable feeds, auto-layout)
- Tailwind CSS v4 with co-located component styles
- shadcn/ui patterns (no library, just the approach)
- GitHub Pages via Actions

## Development

```bash
npm install
npm run dev        # http://localhost:5173/roadie/
npm run build      # Production build
npm run lint       # ESLint
npm run format     # Prettier
```

## Environment Variables

Create a `.env` file:

```
VITE_GOOGLE_MAPS_API_KEY=your-key
VITE_GOOGLE_MAPS_MAP_ID=your-map-id
```

## Data Sources

Camera data is stored locally (no runtime API calls to DOT sites):

| State | Source | Cameras | Video |
|-------|--------|---------|-------|
| AL | api.algotraffic.com | 630 | Live HLS |
| DE | tmc.deldot.gov | 351 | Live HLS |
| FL | fl511.com | 4,881 | Images only |
| GA | 511ga.org | 4,043 | Images only |
| MD | chart.maryland.gov | 549 | Live HLS |
| NC | drivenc.gov | 1,112 | Images only |
| NJ | 511nj.org | 484 | Live HLS |
| PA | 511pa.com | 1,516 | Images only |
| SC | sc.cdn.iteris-atis.com | 760 | Live HLS |
| VA | 511.vdot.virginia.gov | 1,692 | Live HLS |

### Refreshing Camera Data

Raw source data lives in `scripts/data-sources/`. To rebuild the camera database:

```bash
python3 scripts/build-db.py
```

This reads all files in `scripts/data-sources/`, normalizes them, and writes `public/data/cameras.db.json`.

#### Per-State Data Refresh

| State | How to refresh `scripts/data-sources/` file |
|-------|---------------------------------------------|
| AL | `curl -s "https://api.algotraffic.com/v4.0/Cameras" -o scripts/data-sources/al.json` |
| DE | Pre-normalized. Re-scrape from [tmc.deldot.gov](https://tmc.deldot.gov) camera list. |
| FL | Run fetch script in browser console on [fl511.com/cctv](https://fl511.com/cctv) (paginated, 100/page via `/List/GetData/Cameras`). |
| GA | Pre-normalized. Re-scrape from [511ga.org](https://511ga.org) camera list endpoint. |
| MD | Pre-normalized. Re-scrape from [chart.maryland.gov](https://chart.maryland.gov). |
| NC | Pre-normalized. Re-scrape from [drivenc.gov](https://www.drivenc.gov). |
| NJ | Run fetch script in browser console on [511nj.org/cctv](https://www.511nj.org/cctv) (paginated, same platform as FL/PA). |
| PA | Run fetch script in browser console on [511pa.com/cctv](https://www.511pa.com/cctv) (paginated, same platform as FL/NJ). |
| SC | `curl -s "https://sc.cdn.iteris-atis.com/geojson/icons/metadata/Icons_702.geojson" -o scripts/data-sources/cameras.geojson` |
| VA | Fetch from [511.vdot.virginia.gov](https://www.511virginia.org) GeoJSON endpoint, save as `va.geojson`. |

**511 platform states (FL, NJ, PA)** use paginated JSON from `/List/GetData/Cameras`. Browser console script:

```js
async function fetchAll(site) {
  const all = []; let start = 0;
  while (true) {
    const query = {columns:[],order:[],start,length:100,search:{value:""}};
    const url = `/List/GetData/Cameras?query=${encodeURIComponent(JSON.stringify(query))}&lang=en-US`;
    const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }});
    const data = await res.json();
    all.push(...data.data);
    if (all.length >= data.recordsTotal) break;
    start += 100;
  }
  const blob = new Blob([JSON.stringify({recordsTotal: all.length, data: all})]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${site}.json`; a.click();
}
fetchAll('fl'); // or 'nj', 'pa'
```

After updating source files, run `python3 scripts/build-db.py` and commit the updated `public/data/cameras.db.json`.

## History

Previously "Bobby Earl Traffic" (2016-2024), an Angular/SKY UX app for SC-only cameras. Rebuilt in 2026 as Roadie with multi-state support and modern stack.

### Legacy Changelog

- **2019-06-23** - Switched to vertical nav, map location in URL state
- **2018-09-10** - Website reborn (SKY UX)
- **2017-09-09** - Revamped with SKY UX Builder
- **2017-04-01** - Better mobile video player
- **2016-12-19** - Removed Hurricane Matthew info
