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
    "ma": {"host": "mass511.com", "bbox": {"north": 43.0, "south": 41.2, "east": -69.8, "west": -73.6}},
}

import re


def _cars_route_direction(title: str) -> tuple[str, str]:
    """Best-effort route (substring before first ':') and direction (NB/SB/EB/WB)."""
    route = title.split(":", 1)[0].strip() if ":" in title else ""
    m = re.search(r"\b([NSEW]B)\b", title)
    direction = m.group(1) if m else ""
    return route, direction


def _parse_cars_features(mapfeatures: list) -> list[dict]:
    cameras = []
    for feat in mapfeatures:
        if feat.get("__typename") != "Camera":
            continue
        title = (feat.get("title") or "").strip()
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


async def _cars_request(client, host: str, bbox: dict, zoom: int = 12) -> list:
    variables = json.dumps({"input": {**bbox, "zoom": zoom, "layerSlugs": ["normalCameras"]}})
    resp = await client.get(
        f"https://{host}/api/graphql",
        params={"query": _CARS_QUERY, "variables": variables},
        headers={"language": "en", "User-Agent": "Mozilla/5.0"},
    )
    resp.raise_for_status()
    data = resp.json()
    return ((data.get("data", {}) or {}).get("mapFeaturesQuery", {}) or {}).get("mapFeatures", []) or []


async def _fetch_cars(state: str) -> list[dict]:
    cfg = _CARS_STATES[state]
    async with httpx.AsyncClient(timeout=40, follow_redirects=True) as client:
        mapfeatures = await _cars_request(client, cfg["host"], cfg["bbox"])
    return _parse_cars_features(mapfeatures)


async def fetch_ia() -> list[dict]:
    return await _fetch_cars("ia")


async def fetch_mn() -> list[dict]:
    return await _fetch_cars("mn")


async def fetch_ks() -> list[dict]:
    return await _fetch_cars("ks")


async def fetch_ma() -> list[dict]:
    return await _fetch_cars("ma")


# --- Michigan ---
# MDOT MiDrive. JSON list, but fields are HTML-wrapped: lat/lon/id live in a
# "Go to" map link inside `county`, and the still-image src is inside an <img>
# tag in `image`. We regex those out. The image src is a thumbs/*.flv.jpg that
# 301-redirects to micamerasimages.net/*.jpg (browsers follow it). Image-only.
MI_URL = "https://mdotjboss.state.mi.us/MiDrive/camera/list"

_MI_LATLON = re.compile(r"lat=([-\d.]+)&lon=([-\d.]+)")
_MI_ID = re.compile(r"[?&]id=(\d+)")
_MI_IMG = re.compile(r'src="([^"]+)"')
_MI_DIR = re.compile(r"traveling (north|south|east|west)", re.IGNORECASE)
_MI_DIR_ABBR = {"north": "NB", "south": "SB", "east": "EB", "west": "WB"}


async def fetch_mi() -> list[dict]:
    data = await _get_json(MI_URL)
    cameras = []
    for cam in data:
        county = cam.get("county", "") or ""
        m = _MI_LATLON.search(county)
        if not m:
            continue
        lat, lng = float(m.group(1)), float(m.group(2))
        if not lat or not lng:
            continue
        img_html = cam.get("image", "") or ""
        im = _MI_IMG.search(img_html)
        if not im:
            continue
        image_url = im.group(1).split("?")[0]  # strip ?item= cache-buster
        idm = _MI_ID.search(county)
        cam_id = idm.group(1) if idm else image_url.rsplit("/", 1)[-1].split(".")[0]
        route = (cam.get("route") or "").strip()
        location = (cam.get("location") or "").strip()
        name = f"{route} {location}".strip() if location else (route or "Camera")
        dm = _MI_DIR.search(cam.get("direction", "") or "")
        direction = _MI_DIR_ABBR.get(dm.group(1).lower(), "") if dm else ""
        cameras.append({
            "id": str(cam_id),
            "name": name,
            "route": route,
            "jurisdiction": direction,
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


# --- Arizona ---
# az511.gov legacy CARS. mapIcons gives itemId + location[lat,lng]; the still
# image is served per-id at /map/Cctv/<id> (200 image/jpeg, CORS *, 30s cache).
AZ_URL = "https://az511.gov/map/mapIcons/Cameras"

async def fetch_az() -> list[dict]:
    data = await _get_json(AZ_URL)
    items = data.get("item2") or data.get("item") or []
    cameras = []
    for item in items:
        loc = item.get("location") or []
        if len(loc) < 2:
            continue
        lat, lng = loc[0], loc[1]
        if not lat or not lng:
            continue
        cam_id = str(item.get("itemId", ""))
        if not cam_id:
            continue
        cameras.append({
            "id": cam_id,
            "name": (item.get("title") or "").strip() or f"Camera {cam_id}",
            "route": "",
            "jurisdiction": "",
            "lat": lat,
            "lng": lng,
            "image_url": f"https://az511.gov/map/Cctv/{cam_id}",
            "video_url": "",
        })
    return cameras


# --- Illinois ---
# travelmidwest.com Gateway feed (POST {} -> GeoJSON of IL+neighbors). Filter to
# Illinois by the IL- id prefix, skip disabled cams, take the first snapshot URL.
IL_URL = "https://travelmidwest.com/lmiga/cameraMap.json"

async def fetch_il() -> list[dict]:
    async with httpx.AsyncClient(timeout=40, follow_redirects=True) as client:
        resp = await client.post(IL_URL, json={}, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        data = resp.json()
    cameras = []
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        cam_id = props.get("id", "")
        if not cam_id.startswith("IL-") or props.get("dis"):
            continue
        rem = props.get("remUrls") or []
        if not rem:
            continue
        coords = feat.get("geometry", {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lng, lat = coords[0], coords[1]
        if not lat or not lng:
            continue
        cameras.append({
            "id": cam_id,
            "name": (props.get("locDesc") or "").strip() or cam_id,
            "route": "",
            "jurisdiction": props.get("src", ""),
            "lat": lat,
            "lng": lng,
            "image_url": rem[0],
            "video_url": "",
        })
    return cameras


# --- Kentucky ---
# KYTC public ArcGIS FeatureServer. One query returns all cameras with a
# snapshot url + lat/long. Some snapshot values are http:// -> force https to
# avoid mixed-content. Image-only.
KY_URL = (
    "https://services2.arcgis.com/CcI36Pduqd0OR4W9/ArcGIS/rest/services/"
    "trafficCamerasCur_Prd/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json"
)

async def fetch_ky() -> list[dict]:
    data = await _get_json(KY_URL)
    cameras = []
    for feat in data.get("features", []):
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        lat = attrs.get("latitude") or geom.get("y")
        lng = attrs.get("longitude") or geom.get("x")
        snap = attrs.get("snapshot") or ""
        if not lat or not lng or not snap:
            continue
        if snap.startswith("http://"):
            snap = "https://" + snap[len("http://"):]
        cam_id = str(attrs.get("id") or attrs.get("OBJECTID") or "")
        name = (attrs.get("name") or attrs.get("description") or f"Camera {cam_id}").strip()
        cameras.append({
            "id": cam_id,
            "name": name,
            "route": (attrs.get("highway") or "").strip(),
            "jurisdiction": (attrs.get("direction") or "").strip(),
            "lat": lat,
            "lng": lng,
            "image_url": snap,
            "video_url": "",
        })
    return cameras


# --- Iteris ATIS states (South Dakota, Montana) ---
# Public GeoJSON on the Iteris CDN. Each feature is a SITE with a
# properties.cameras[] array of views; explode each view into its own camera
# with its direct .jpg image (id <siteId>-<index>). Image-only, no CORS issue
# (build-time fetch; <img> display at runtime).
_ITERIS_STATES = {
    "sd": "https://sd.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson",
    "mt": "https://mt.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson",
}


async def _fetch_iteris(state: str) -> list[dict]:
    data = await _get_json(_ITERIS_STATES[state])
    cameras = []
    for feat in data.get("features", []):
        props = feat.get("properties", {}) or {}
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lng, lat = coords[0], coords[1]
        if not lat or not lng:
            continue
        site_id = feat.get("id") or props.get("id") or ""
        route = (props.get("route") or "").strip()
        site_name = (props.get("name") or props.get("description") or "").strip()
        views = props.get("cameras", []) or []
        for i, v in enumerate(views):
            img = v.get("image") or ""
            if not img or "unavailable" in img.lower():
                continue
            view_id = v.get("id") or str(i)
            # SD reuses per-view ids ("0","1",...) across sites, so always
            # namespace by site to keep the camera id globally unique.
            vid = view_id if (site_id and str(view_id).startswith(str(site_id))) else f"{site_id}-{view_id}"
            vname = (v.get("name") or v.get("description") or site_name or route).strip()
            name = f"{site_name} - {vname}".strip(" -") if site_name and vname != site_name else (vname or site_name or route)
            cameras.append({
                "id": str(vid),
                "name": name or f"Camera {vid}",
                "route": route,
                "jurisdiction": (v.get("direction") or "").strip(),
                "lat": lat,
                "lng": lng,
                "image_url": img,
                "video_url": "",
            })
    return cameras


async def fetch_sd() -> list[dict]:
    return await _fetch_iteris("sd")


async def fetch_mt() -> list[dict]:
    return await _fetch_iteris("mt")