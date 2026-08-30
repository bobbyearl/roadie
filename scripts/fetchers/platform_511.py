"""Fetcher for 511 platform states (WI, LA, NV, ID, AK, NE, NY).

These all use the same Iteris-based platform with:
- /map/mapIcons/Cameras (coordinates, requires session cookie from visiting map page)
- /tooltip/Cameras/{id}?lang=en-US (name, camera ID, video URL - public, no auth)

Playwright is needed to get the session cookie for mapIcons.
Tooltips work without auth via plain HTTP.
"""

import asyncio
import json
import re
from typing import Optional

import httpx

# State configs: domain, max_site_id (from mapIcons), tooltip parsing quirks
STATES_511 = {
    "wi": {"domain": "511wi.gov", "name_tag": "b"},
    "la": {"domain": "511la.org", "name_tag": "b"},
    "nv": {"domain": "www.nvroads.com", "name_tag": "b"},
    "id": {"domain": "511.idaho.gov", "name_tag": "strong"},
    "ak": {"domain": "511.alaska.gov", "name_tag": "strong"},
    "ne": {"domain": "newengland511.org", "name_tag": "strong"},
    "ny": {"domain": "511ny.org", "name_tag": "b"},
}


async def fetch_coordinates(domain: str) -> list[dict]:
    """Fetch camera coordinates via Playwright (needs session cookie)."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Visit the map page to get the session cookie
        await page.goto(f"https://{domain}/map", wait_until="networkidle", timeout=30000)

        # Now fetch the coordinates endpoint with the session
        cookies = await context.cookies()
        cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)

        await browser.close()

    # Use the cookie to fetch coordinates via httpx
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(
            f"https://{domain}/map/mapIcons/Cameras",
            headers={"Cookie": cookie_str, "X-Requested-With": "XMLHttpRequest"},
        )
        resp.raise_for_status()
        data = resp.json()

    # Parse the coordinate items - response uses 'item' or 'item2' key
    items = data.get("item", data.get("item2", []))
    if isinstance(items, dict):
        # Fallback: if 'item' is the metadata dict, use 'item2'
        items = data.get("item2", [])

    cameras = []
    for item in items:
        loc = item.get("location", [0, 0])
        if isinstance(loc, list):
            lat, lng = loc[0], loc[1]
        elif isinstance(loc, dict):
            lat = float(loc.get("lat", 0))
            lng = float(loc.get("lng", 0))
        else:
            continue
        cameras.append({
            "site_id": int(item["itemId"]),
            "lat": lat,
            "lng": lng,
        })
    return cameras


async def fetch_tooltip(domain: str, site_id: int, name_tag: str, client: httpx.AsyncClient) -> Optional[dict]:
    """Fetch tooltip data for a single camera. Returns None on failure."""
    try:
        resp = await client.get(
            f"https://{domain}/tooltip/Cameras/{site_id}",
            params={"lang": "en-US"},
        )
        if resp.status_code != 200:
            return None

        html = resp.text
        if not html or len(html) < 20:
            return None

        # Extract name
        name_match = re.search(rf"<{name_tag}>([^<]+)</{name_tag}>", html)
        name = name_match.group(1).strip() if name_match else ""

        # Extract camera ID (for image URL)
        cam_id_match = re.search(r'data-camera-id="(\d+)"', html)
        if not cam_id_match:
            # Some states use src attribute directly
            cam_id_match = re.search(r'src="[^"]*?/Cctv/(\d+)"', html)
        if not cam_id_match:
            # Fallback: try data-fs-title or alt text for image-only states
            cam_id_match = re.search(r'data-lazy="[^"]*?/Cctv/(\d+)"', html)

        cam_id = cam_id_match.group(1) if cam_id_match else str(site_id)

        # Extract video URL
        video_match = re.search(r'(https?://[^"\']+/playlist\.m3u8)', html)
        video_url = video_match.group(1) if video_match else ""

        return {
            "site_id": site_id,
            "camera_id": cam_id,
            "name": name,
            "video_url": video_url,
        }
    except Exception:
        return None


async def fetch_tooltips_batch(domain: str, site_ids: list[int], name_tag: str, concurrency: int = 15) -> list[dict]:
    """Fetch tooltips for all site IDs with concurrency limiting."""
    results = []
    semaphore = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        async def fetch_one(sid: int):
            async with semaphore:
                # Try up to 4 times with linear backoff. Tooltips are flaky
                # (~35% miss at high concurrency); missing tooltips only cost a
                # name/camera_id now (id is keyed on site_id), but retrying hard
                # keeps names populated.
                for attempt in range(4):
                    result = await fetch_tooltip(domain, sid, name_tag, client)
                    if result:
                        results.append(result)
                        return
                    await asyncio.sleep(0.2 * (attempt + 1))

        tasks = [fetch_one(sid) for sid in site_ids]
        await asyncio.gather(*tasks)

    return results


async def fetch_state(state_id: str) -> list[dict]:
    """Fetch all cameras for a 511-platform state. Returns normalized camera list."""
    config = STATES_511[state_id]
    domain = config["domain"]
    name_tag = config["name_tag"]

    print(f"  [{state_id}] Fetching coordinates from {domain}...")
    coords = await fetch_coordinates(domain)
    print(f"  [{state_id}] Got {len(coords)} coordinate entries")

    site_ids = [c["site_id"] for c in coords]
    print(f"  [{state_id}] Fetching tooltips...")
    tooltips = await fetch_tooltips_batch(domain, site_ids, name_tag)
    print(f"  [{state_id}] Got {len(tooltips)} tooltips")

    # Build lookup from site_id to tooltip data
    tooltip_map = {t["site_id"]: t for t in tooltips}

    # Merge coordinates + tooltips.
    # Identity is keyed on site_id: it is unique (one per map marker), stable
    # across runs, and always present from the coordinate feed. The tooltip's
    # camera_id is only used to build the image URL and is NOT used as the id,
    # because a missing tooltip used to fall back to site_id as a fake camera_id,
    # colliding two distinct cameras onto one id and silently dropping ~100 ID
    # cameras (whichever tooltips timed out that run) in the dict-keyed build.
    cameras = []
    for coord in coords:
        sid = coord["site_id"]
        tip = tooltip_map.get(sid, {})
        cam_id = tip.get("camera_id", str(sid))

        cameras.append({
            "id": str(sid),
            "name": tip.get("name", f"Camera {sid}"),
            "route": "",
            "jurisdiction": "",
            "lat": coord["lat"],
            "lng": coord["lng"],
            "image_url": f"https://{domain}/map/Cctv/{cam_id}",
            "video_url": tip.get("video_url", ""),
        })

    return cameras


def fetch(state_id: str) -> list[dict]:
    """Synchronous entry point."""
    return asyncio.run(fetch_state(state_id))
