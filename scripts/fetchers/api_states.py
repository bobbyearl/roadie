"""Fetchers for states with public JSON/GeoJSON APIs (no browser needed).

These states expose camera data via public HTTP endpoints that work with plain curl/httpx.
"""

import httpx


async def _get_json(url: str, timeout: int = 30) -> dict | list:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


# --- South Carolina ---
# GeoJSON from Iteris CDN
SC_URL = "https://sc.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson"

async def fetch_sc() -> list[dict]:
    data = await _get_json(SC_URL)
    cameras = []
    for feat in data["features"]:
        props = feat["properties"]
        coords = feat["geometry"]["coordinates"]
        cameras.append({
            "id": props["id"],
            "name": props.get("description") or props.get("name", ""),
            "route": props.get("route", ""),
            "jurisdiction": props.get("jurisdiction", ""),
            "lat": coords[1],
            "lng": coords[0],
            "image_url": f"https://scdotsnap.us-east-1.skyvdn.com/{props['name']}.png",
            "video_url": props.get("ios_url", ""),
        })
    return cameras


# --- Virginia ---
# GeoJSON from VDOT 511
VA_URL = "https://va.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson"

async def fetch_va() -> list[dict]:
    data = await _get_json(VA_URL)
    cameras = []
    for feat in data["features"]:
        props = feat["properties"]
        coords = feat["geometry"]["coordinates"]
        cameras.append({
            "id": props["id"],
            "name": props.get("description") or props.get("name", ""),
            "route": props.get("route", ""),
            "jurisdiction": props.get("jurisdiction", ""),
            "lat": coords[1],
            "lng": coords[0],
            "image_url": props.get("image_url", ""),
            "video_url": props.get("ios_url", "") or props.get("video_url", ""),
        })
    return cameras


# --- Georgia ---
GA_URL = "https://511ga.org/api/v2/get/cameras"

async def fetch_ga() -> list[dict]:
    data = await _get_json(GA_URL)
    cameras = []
    for cam in data:
        lat = cam.get("latitude", 0)
        lng = cam.get("longitude", 0)
        if not lat or not lng:
            continue
        image_url = ""
        video_url = ""
        for detail in cam.get("details", []):
            if detail.get("type") == "stream":
                video_url = detail.get("url", "")
            elif detail.get("type") == "image":
                image_url = detail.get("url", "")
        cameras.append({
            "id": str(cam["id"]),
            "name": cam.get("name", ""),
            "route": cam.get("route", ""),
            "jurisdiction": cam.get("jurisdiction", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": video_url,
        })
    return cameras


# --- Florida ---
FL_URL = "https://fl511.com/map/mapIcons/Cameras"

async def fetch_fl() -> list[dict]:
    """Florida - fl511.com uses Iteris platform, coordinates are public."""
    data = await _get_json(FL_URL)
    # Response uses 'item' or 'item2' key depending on version
    items = data.get("item", data.get("item2", []))
    cameras = []
    for item in items:
        cam_id = str(item["itemId"])
        # Location can be [lat, lng] array or {lat, lng} object
        loc = item.get("location", [0, 0])
        if isinstance(loc, list):
            lat, lng = loc[0], loc[1]
        else:
            lat = float(loc.get("lat", 0))
            lng = float(loc.get("lng", 0))
        if not lat or not lng:
            continue
        cameras.append({
            "id": cam_id,
            "name": item.get("title", "") or item.get("description", f"Camera {cam_id}"),
            "route": "",
            "jurisdiction": "",
            "lat": lat,
            "lng": lng,
            "image_url": f"https://fl511.com/map/Cctv/{cam_id}",
            "video_url": "",
        })
    return cameras


# --- Alabama ---
AL_URL = "https://api.algotraffic.com/v4/Cameras"

async def fetch_al() -> list[dict]:
    data = await _get_json(AL_URL)
    cameras = []
    for cam in data:
        loc = cam.get("location", {})
        lat = loc.get("latitude", 0)
        lng = loc.get("longitude", 0)
        if not lat or not lng:
            continue
        video_url = ""
        playback = cam.get("playbackUrls", {})
        if playback:
            video_url = playback.get("hls", "")
        cameras.append({
            "id": str(cam["id"]),
            "name": f"{loc.get('displayRouteDesignator', '')} @ {loc.get('displayCrossStreet', '')}".strip(" @"),
            "route": loc.get("displayRouteDesignator", ""),
            "jurisdiction": loc.get("county", ""),
            "lat": lat,
            "lng": lng,
            "image_url": cam.get("snapshotImageUrl", f"https://api.algotraffic.com/v4/Cameras/{cam['id']}/snapshot.jpg"),
            "video_url": video_url,
        })
    return cameras


# --- Tennessee ---
TN_URL = "https://smartway.tn.gov/traffic/api/Cameras"

async def fetch_tn() -> list[dict]:
    data = await _get_json(TN_URL)
    cameras = []
    for cam in data:
        if cam.get("active") != "true":
            continue
        cameras.append({
            "id": str(cam["id"]),
            "name": cam.get("title", cam.get("description", f"Camera {cam['id']}")),
            "route": cam.get("route", ""),
            "jurisdiction": cam.get("jurisdiction", ""),
            "lat": cam.get("lat", 0),
            "lng": cam.get("lng", 0),
            "image_url": cam.get("thumbnailUrl", ""),
            "video_url": cam.get("httpsVideoUrl", ""),
        })
    return cameras


# --- California ---
CA_DISTRICTS = list(range(1, 13))
CA_URL_TEMPLATE = "https://cwwp2.dot.ca.gov/data/d{district}/cctv/cctvStatusD{district:02d}.json"

async def fetch_ca() -> list[dict]:
    cameras = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for district in CA_DISTRICTS:
            try:
                url = CA_URL_TEMPLATE.format(district=district)
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                for entry in data.get("data", []):
                    cam = entry.get("cctv", {})
                    loc = cam.get("location", {})
                    img_data = cam.get("imageData", {}).get("static", {})
                    lat = float(loc.get("latitude", 0))
                    lng = float(loc.get("longitude", 0))
                    if not lat or not lng:
                        continue
                    cam_id = cam.get("index", "")
                    name = loc.get("locationName", f"Camera {cam_id}")
                    cameras.append({
                        "id": f"d{loc.get('district', district)}_{cam_id}",
                        "name": name,
                        "route": loc.get("route", ""),
                        "jurisdiction": loc.get("county", f"District {district}"),
                        "lat": lat,
                        "lng": lng,
                        "image_url": img_data.get("currentImageURL", ""),
                        "video_url": cam.get("imageData", {}).get("streamingVideoURL", ""),
                    })
            except Exception:
                continue
    return cameras


# --- North Carolina ---
NC_URL = "https://drivenc.gov/api/v1/cameras"

async def fetch_nc() -> list[dict]:
    """NC has a public API - try it, fall back to local file."""
    try:
        data = await _get_json(NC_URL)
        return data
    except Exception:
        # NC API may not be public - caller should fall back to local file
        raise


# --- New Jersey ---
NJ_URL = "https://511nj.org/api/v2/get/cameras"

async def fetch_nj() -> list[dict]:
    data = await _get_json(NJ_URL)
    cameras = []
    for cam in data:
        lat = cam.get("latitude", 0)
        lng = cam.get("longitude", 0)
        if not lat or not lng:
            continue
        video_url = ""
        image_url = ""
        for detail in cam.get("details", []):
            if detail.get("type") == "stream":
                video_url = detail.get("url", "")
            elif detail.get("type") == "image":
                image_url = detail.get("url", "")
        cameras.append({
            "id": str(cam["id"]),
            "name": cam.get("name", ""),
            "route": cam.get("route", ""),
            "jurisdiction": cam.get("jurisdiction", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": video_url,
        })
    return cameras


# --- North Dakota ---
# Public GeoJSON from NDDOT. Each feature is a SITE holding a Cameras[] array of
# individual views (each a .jpg via LinkPath). Explode each view into its own
# camera so multi-angle sites show every view; id is <ObjectID>-<index>.
ND_URL = "https://travelfiles.dot.nd.gov/geojson_nc/cameras.json"

async def fetch_nd() -> list[dict]:
    data = await _get_json(ND_URL)
    cameras = []
    for feat in data["features"]:
        props = feat["properties"]
        coords = feat["geometry"]["coordinates"]
        lat, lng = coords[1], coords[0]
        if not lat or not lng:
            continue
        object_id = props.get("ObjectID")
        region = props.get("Region", "")
        views = props.get("Cameras", []) or []
        for i, view in enumerate(views):
            img = view.get("LinkPath") or view.get("FullPath") or ""
            if not img:
                continue
            cameras.append({
                "id": f"{object_id}-{i}",
                "name": (view.get("Description") or "").strip(),
                "route": "",
                "jurisdiction": region,
                "lat": lat,
                "lng": lng,
                "image_url": img,
                "video_url": "",
            })
    return cameras


# --- Arkansas ---
# Public GeoJSON from ARDOT (IDrive Arkansas). The feed's only stream is
# `hls_stream_protected`, a session-gated HLS that 302-redirects to a
# short-lived tokenized CDN URL Roadie (a static frontend) cannot mint or
# proxy. But each camera also has a public still at
# layers.idrivearkansas.com/cameras/<id>.jpg (open, CORS-clean, ~60s refresh),
# so Arkansas is served image-only. Video is deferred until we have an edge
# proxy to mint the per-view token.
AR_URL = "https://layers.idrivearkansas.com/cameras.geojson"

async def fetch_ar() -> list[dict]:
    data = await _get_json(AR_URL)
    cameras = []
    for feat in data["features"]:
        props = feat["properties"]
        coords = feat["geometry"]["coordinates"]
        lat, lng = coords[1], coords[0]
        if not lat or not lng:
            continue
        cam_id = props.get("id")
        if cam_id is None:
            continue
        cameras.append({
            "id": str(cam_id),
            "name": (props.get("name") or "").strip(),
            "route": str(props.get("route", "")),
            "jurisdiction": props.get("route_type", ""),
            "lat": lat,
            "lng": lng,
            "image_url": f"https://layers.idrivearkansas.com/cameras/{cam_id}.jpg",
            "video_url": "",
        })
    return cameras