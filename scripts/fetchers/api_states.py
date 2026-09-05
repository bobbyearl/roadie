"""Fetchers for states with public JSON/GeoJSON APIs (no browser needed).

These states expose camera data via public HTTP endpoints that work with plain curl/httpx.
"""

import httpx
import json


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


# --- Washington ---
# WSDOT public JSON. ArcGIS-style {fields, features:[{attributes, geometry}]}.
# The payload is latin-1 encoded and geometry is Web Mercator (EPSG:3857),
# so we decode as latin-1 and unproject x/y to lat/lng. Each feature carries a
# direct still-image URL (ImageURL); image-only.
import math

WA_URL = "https://data.wsdot.wa.gov/travelcenter/Cameras.json"


def _webmercator_to_lonlat(x: float, y: float) -> tuple[float, float]:
    lng = (x / 20037508.34) * 180.0
    lat = (y / 20037508.34) * 180.0
    lat = 180.0 / math.pi * (2.0 * math.atan(math.exp(lat * math.pi / 180.0)) - math.pi / 2.0)
    return lat, lng


async def fetch_wa() -> list[dict]:
    async with httpx.AsyncClient(timeout=40, follow_redirects=True) as client:
        resp = await client.get(WA_URL)
        resp.raise_for_status()
        data = json.loads(resp.content.decode("latin-1"))
    features = data.get("features", []) if isinstance(data, dict) else data
    cameras = []
    for feat in features:
        props = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        x, y = geom.get("x"), geom.get("y")
        img = props.get("ImageURL", "")
        cam_id = props.get("CameraID")
        if x is None or y is None or not img or cam_id is None:
            continue
        lat, lng = _webmercator_to_lonlat(x, y)
        if not lat or not lng:
            continue
        cameras.append({
            "id": str(cam_id),
            "name": (props.get("CameraTitle") or "").strip(),
            "route": "",
            "jurisdiction": props.get("CompassDirection", ""),
            "lat": lat,
            "lng": lng,
            "image_url": img,
            "video_url": "",
        })
    return cameras


# --- CARS / OneNetwork 511 platform (Iowa, Minnesota, Kansas) ---
# These states share one GraphQL SPA at https://<host>/api/graphql. The map's
# MapFeatures op returns the full camera inventory in a single GET with a
# statewide bbox + zoom>=12 (which defeats server-side clustering). Each camera
# carries views[] with a still-image url (present even on VIDEO-category cams);
# we take the first view with a non-null url, so all cameras are image-only.
# NOTE: the app's query declares an unused $plowType var that makes the server
# 400 with "Server error" - it is deliberately omitted here.
_CARS_QUERY = (
    "query MapFeatures($input: MapFeaturesArgs!) { mapFeaturesQuery(input: $input) "
    "{ mapFeatures { uri title bbox __typename features { id geometry properties type } "
    "... on Cluster { maxZoom } ... on Camera { active views(limit: 5) "
    "{ uri category ... on CameraView { url } } } } error { message type } } }"
)

# Statewide bounding boxes (a little padding; bbox only needs to cover the state,
# it does not clip or cap the result).
_CARS_STATES = {
    "ia": {"host": "511ia.org", "bbox": {"north": 43.7, "south": 40.2, "east": -89.9, "west": -96.8}},
    "mn": {"host": "511mn.org", "bbox": {"north": 49.5, "south": 43.4, "east": -89.4, "west": -97.3}},
    "ks": {"host": "www.kandrive.gov", "bbox": {"north": 40.1, "south": 36.9, "east": -94.5, "west": -102.1}},
}

import re


def _cars_route_direction(title: str) -> tuple[str, str]:
    """Best-effort route (substring before first ':') and direction (NB/SB/EB/WB)."""
    route = title.split(":", 1)[0].strip() if ":" in title else ""
    m = re.search(r"\b([NSEW]B)\b", title)
    direction = m.group(1) if m else ""
    return route, direction


async def _fetch_cars(state: str) -> list[dict]:
    cfg = _CARS_STATES[state]
    variables = json.dumps({"input": {**cfg["bbox"], "zoom": 12, "layerSlugs": ["normalCameras"]}})
    params = {"query": _CARS_QUERY, "variables": variables}
    async with httpx.AsyncClient(timeout=40, follow_redirects=True) as client:
        resp = await client.get(
            f"https://{cfg['host']}/api/graphql",
            params=params,
            headers={"language": "en", "User-Agent": "Mozilla/5.0"},
        )
        resp.raise_for_status()
        data = resp.json()
    features = (data.get("data", {}) or {}).get("mapFeaturesQuery", {}) or {}
    mapfeatures = features.get("mapFeatures", []) or []
    cameras = []
    for feat in mapfeatures:
        if feat.get("__typename") != "Camera":
            continue
        title = (feat.get("title") or "").strip()
        # first view with a usable still url
        image_url = ""
        for v in feat.get("views", []) or []:
            if v.get("url"):
                image_url = v["url"]
                break
        if not image_url:
            continue
        geo = (feat.get("features") or [{}])[0].get("geometry", {}) or {}
        coords = geo.get("coordinates") or []
        bbox = feat.get("bbox") or []
        if len(coords) >= 2:
            lng, lat = coords[0], coords[1]
        elif len(bbox) >= 2:
            lng, lat = bbox[0], bbox[1]
        else:
            continue
        if not lat or not lng:
            continue
        route, direction = _cars_route_direction(title)
        cam_id = (feat.get("uri") or "").replace("camera/", "")
        cameras.append({
            "id": cam_id,
            "name": title,
            "route": route,
            "jurisdiction": direction,
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


async def fetch_ia() -> list[dict]:
    return await _fetch_cars("ia")


async def fetch_mn() -> list[dict]:
    return await _fetch_cars("mn")


async def fetch_ks() -> list[dict]:
    return await _fetch_cars("ks")