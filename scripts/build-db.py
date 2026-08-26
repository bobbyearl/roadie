#!/usr/bin/env python3
"""
Build cameras.db.json from raw data source files.

Usage:
    python3 scripts/build-db.py

Output:
    public/data/cameras.db.json

Each state has a parser function that normalizes its raw data into a common
intermediate format, which is then compressed into the final DB structure.
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data-sources")
OUTPUT = os.path.join(SCRIPT_DIR, "..", "public", "data", "cameras.db.json")

# States that have working video (HLS streams confirmed accessible without DRM)
VIDEO_STATES = {"sc", "va", "de", "md", "tn", "wi", "la", "nv"}


def parse_sc():
    """South Carolina - GeoJSON from sc.cdn.iteris-atis.com"""
    with open(os.path.join(DATA_DIR, "cameras.geojson")) as f:
        data = json.load(f)

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
            "image_url": f"https://scdotsnap.us-east-1.skyvdn.com/thumbs/{props['name']}.flv.png",
            "video_url": props.get("ios_url", ""),
        })
    return cameras


def parse_va():
    """Virginia - GeoJSON from 511.vdot.virginia.gov"""
    with open(os.path.join(DATA_DIR, "va.geojson")) as f:
        data = json.load(f)

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


def parse_nc():
    """North Carolina - pre-normalized JSON from drivenc.gov"""
    with open(os.path.join(DATA_DIR, "nc.json")) as f:
        data = json.load(f)
    return data  # Already in standard format


def parse_ga():
    """Georgia - pre-normalized JSON from 511ga.org"""
    with open(os.path.join(DATA_DIR, "ga.json")) as f:
        data = json.load(f)
    return data  # Already in standard format


def parse_md():
    """Maryland - pre-normalized JSON from chart.maryland.gov"""
    with open(os.path.join(DATA_DIR, "md.json")) as f:
        data = json.load(f)
    return data  # Already in standard format


def parse_de():
    """Delaware - pre-normalized JSON from deldot.gov"""
    with open(os.path.join(DATA_DIR, "de.json")) as f:
        data = json.load(f)
    return data  # Already in standard format


def parse_fl():
    """Florida - 511 platform JSON from fl511.com"""
    with open(os.path.join(DATA_DIR, "fl.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data["data"]:
        cam_id = cam["DT_RowId"]

        # Coords in WKT format: "POINT (-81.580975 28.292213)"
        lat, lng = 0, 0
        try:
            wkt = cam["latLng"]["geography"]["wellKnownText"]
            # POINT (lng lat)
            coords = wkt.replace("POINT (", "").replace(")", "").split()
            lng = float(coords[0])
            lat = float(coords[1])
        except (KeyError, TypeError, IndexError, ValueError):
            pass

        # Name from location field or image description
        name = cam.get("location", "")
        if not name and cam.get("images"):
            name = cam["images"][0].get("description", "").replace("_", " ").strip()
        if not name:
            name = f"Camera {cam_id}"

        image_url = f"https://fl511.com/map/Cctv/{cam_id}"
        cameras.append({
            "id": cam_id,
            "name": name,
            "route": cam.get("roadway", ""),
            "jurisdiction": cam.get("county", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


def parse_nj():
    """New Jersey - 511 API JSON from 511nj.org"""
    with open(os.path.join(DATA_DIR, "nj.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data["data"]:
        video_url = ""
        image_url = ""
        if cam.get("cameraMainDetail"):
            for detail in cam["cameraMainDetail"]:
                if detail.get("camera_use_flag") == "HLS":
                    video_url = detail.get("url", "")
                elif detail.get("camera_type") == "Image":
                    image_url = detail.get("url", "")

        cameras.append({
            "id": str(cam["id"]),
            "name": cam.get("name", f"Camera {cam['id']}"),
            "route": cam.get("name", "").split(" @ ")[0] if " @ " in cam.get("name", "") else "",
            "jurisdiction": cam.get("deviceDescription", ""),
            "lat": float(cam.get("latitude", 0)),
            "lng": float(cam.get("longitude", 0)),
            "image_url": image_url,
            "video_url": video_url,
        })
    return cameras


def parse_pa():
    """Pennsylvania - 511 platform JSON from 511pa.com"""
    with open(os.path.join(DATA_DIR, "pa.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data["data"]:
        cam_id = cam["DT_RowId"]

        # Coords in WKT format: "POINT (lng lat)"
        lat, lng = 0, 0
        try:
            wkt = cam["latLng"]["geography"]["wellKnownText"]
            coords = wkt.replace("POINT (", "").replace(")", "").split()
            lng = float(coords[0])
            lat = float(coords[1])
        except (KeyError, TypeError, IndexError, ValueError):
            pass

        # Name from location field or image description
        name = cam.get("location", "")
        if not name and cam.get("images"):
            name = cam["images"][0].get("description", "").replace("_", " ").strip()
        if not name:
            name = f"Camera {cam_id}"

        image_url = f"https://www.511pa.com/map/Cctv/{cam_id}"
        cameras.append({
            "id": cam_id,
            "name": name,
            "route": cam.get("roadway", ""),
            "jurisdiction": cam.get("county", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


def parse_ut():
    """Utah - 511 platform JSON from udottraffic.utah.gov (same as FL/PA)"""
    with open(os.path.join(DATA_DIR, "ut.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data["data"]:
        cam_id = cam["DT_RowId"]

        # Coords in WKT format: "POINT (lng lat)"
        lat, lng = 0, 0
        try:
            wkt = cam["latLng"]["geography"]["wellKnownText"]
            coords = wkt.replace("POINT (", "").replace(")", "").split()
            lng = float(coords[0])
            lat = float(coords[1])
        except (KeyError, TypeError, IndexError, ValueError):
            pass

        # Name from location field
        name = cam.get("location", "")
        if not name:
            name = f"Camera {cam_id}"

        image_url = f"https://www.udottraffic.utah.gov/map/Cctv/{cam_id}"
        cameras.append({
            "id": cam_id,
            "name": name,
            "route": cam.get("roadway", ""),
            "jurisdiction": cam.get("county", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


def parse_ct():
    """Connecticut - 511 platform JSON from ctroads.org (same as FL/PA/UT)"""
    with open(os.path.join(DATA_DIR, "ct.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data["data"]:
        cam_id = cam["DT_RowId"]

        # Coords in WKT format: "POINT (lng lat)"
        lat, lng = 0, 0
        try:
            wkt = cam["latLng"]["geography"]["wellKnownText"]
            coords = wkt.replace("POINT (", "").replace(")", "").split()
            lng = float(coords[0])
            lat = float(coords[1])
        except (KeyError, TypeError, IndexError, ValueError):
            pass

        # Name from location field
        name = cam.get("location", "")
        if not name:
            name = f"Camera {cam_id}"

        image_url = f"https://ctroads.org/map/Cctv/{cam_id}"
        cameras.append({
            "id": cam_id,
            "name": name,
            "route": cam.get("roadway", ""),
            "jurisdiction": cam.get("city", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": "",
        })
    return cameras


def parse_al():
    """Alabama - REST API from api.algotraffic.com"""
    with open(os.path.join(DATA_DIR, "al.json")) as f:
        data = json.load(f)

    cameras = []
    for cam in data:
        loc = cam.get("location", {})
        route = loc.get("displayRouteDesignator", "")
        direction = loc.get("direction", "")
        cross = loc.get("displayCrossStreet", "")
        name = f"{route} {direction} @ {cross}".strip() if cross else f"{route} {direction}".strip()

        video_url = ""
        playback = cam.get("playbackUrls", {})
        if playback:
            video_url = playback.get("hls", "")

        image_url = f"https://api.algotraffic.com/v4/Cameras/{cam['id']}/snapshot.jpg"

        cameras.append({
            "id": str(cam["id"]),
            "name": name,
            "route": route,
            "jurisdiction": loc.get("county", ""),
            "lat": loc.get("latitude", 0),
            "lng": loc.get("longitude", 0),
            "image_url": image_url,
            "video_url": video_url,
        })
    return cameras


def parse_tn():
    """Tennessee - TDOT OpenData API (same SkyVDN infrastructure as SC, no DRM)"""
    with open(os.path.join(DATA_DIR, "tn.json")) as f:
        data = json.load(f)

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


def parse_ca():
    """California - Caltrans per-district JSON from cwwp2.dot.ca.gov"""
    with open(os.path.join(DATA_DIR, "ca.json")) as f:
        data = json.load(f)

    cameras = []
    for entry in data["data"]:
        cam = entry.get("cctv", {})
        loc = cam.get("location", {})
        img_data = cam.get("imageData", {}).get("static", {})

        lat = float(loc.get("latitude", 0))
        lng = float(loc.get("longitude", 0))
        if not lat or not lng:
            continue

        cam_id = cam.get("index", "")
        name = loc.get("locationName", f"Camera {cam_id}")
        image_url = img_data.get("currentImageURL", "")
        video_url = cam.get("imageData", {}).get("streamingVideoURL", "")

        cameras.append({
            "id": f"d{loc.get('district', '0')}_{cam_id}",
            "name": name,
            "route": loc.get("route", ""),
            "jurisdiction": loc.get("county", ""),
            "lat": lat,
            "lng": lng,
            "image_url": image_url,
            "video_url": video_url,
        })
    return cameras


def parse_wi():
    """Wisconsin - 511wi.gov tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "wi.json")) as f:
        return json.load(f)


def parse_la():
    """Louisiana - 511la.org tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "la.json")) as f:
        return json.load(f)


def parse_nv():
    """Nevada - nvroads.com tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "nv.json")) as f:
        return json.load(f)


def parse_id():
    """Idaho - 511.idaho.gov tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "id.json")) as f:
        return json.load(f)


def parse_ak():
    """Alaska - 511.alaska.gov tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "ak.json")) as f:
        return json.load(f)


def parse_ne():
    """New England (ME/VT) - newengland511.org tooltip scrape + mapIcons coordinates"""
    with open(os.path.join(DATA_DIR, "ne.json")) as f:
        return json.load(f)


# State registry: (state_id, parser_function)
# Order here determines the state index in the DB
STATES = [
    ("ak", parse_ak),
    ("al", parse_al),
    ("ca", parse_ca),
    ("ct", parse_ct),
    ("de", parse_de),
    ("fl", parse_fl),
    ("ga", parse_ga),
    ("id", parse_id),
    ("la", parse_la),
    ("md", parse_md),
    ("nc", parse_nc),
    ("ne", parse_ne),
    ("nj", parse_nj),
    ("nv", parse_nv),
    ("pa", parse_pa),
    ("sc", parse_sc),
    ("tn", parse_tn),
    ("ut", parse_ut),
    ("va", parse_va),
    ("wi", parse_wi),
]


def build_db():
    """Build the compressed camera database."""
    states = []
    jurisdictions = []
    routes = []
    cameras = []

    jurisdiction_idx = {}
    route_idx = {}

    for state_id, parser in STATES:
        print(f"  Parsing {state_id}...", end=" ")
        state_cameras = parser()
        state_index = len(states)
        states.append(state_id)

        has_video = state_id in VIDEO_STATES

        for cam in state_cameras:
            # Skip cameras without coordinates
            if not cam.get("lat") or not cam.get("lng"):
                continue

            # Get or create jurisdiction index
            j = cam.get("jurisdiction", "")
            if j not in jurisdiction_idx:
                jurisdiction_idx[j] = len(jurisdictions)
                jurisdictions.append(j)
            j_idx = jurisdiction_idx[j]

            # Get or create route index
            r = cam.get("route", "")
            if r not in route_idx:
                route_idx[r] = len(routes)
                routes.append(r)
            r_idx = route_idx[r]

            # Determine hasVideo: state supports video AND this camera has a video_url
            cam_has_video = 1 if (has_video and cam.get("video_url")) else 0

            # Ensure camera ID has state prefix
            cam_id = cam["id"]
            if not cam_id.startswith(f"{state_id}:"):
                cam_id = f"{state_id}:{cam_id}"

            cameras.append([
                round(cam["lat"], 5),
                round(cam["lng"], 5),
                cam_id,
                state_index,
                cam["name"],
                r_idx,
                j_idx,
                cam.get("image_url", ""),
                cam.get("video_url", "") if cam_has_video else "",
                cam_has_video,
            ])

        print(f"{len(state_cameras)} cameras")

    db = {
        "states": states,
        "jurisdictions": jurisdictions,
        "routes": routes,
        "cameras": cameras,
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(db, f, separators=(",", ":"))

    # Generate pins.json: [[lat, lng, id], ...] - inlined into HTML for instant map render
    pins = [[cam[0], cam[1], cam[2]] for cam in cameras]
    pins_path = os.path.join(os.path.dirname(OUTPUT), "pins.json")
    with open(pins_path, "w") as f:
        json.dump(pins, f, separators=(",", ":"))

    # Generate meta.json: {jurisdictions, routes, cameras: {id: [name, routeIdx, jurisdictionIdx, imageUrl, videoUrl, hasVideo]}}
    meta_cameras = {}
    for cam in cameras:
        meta_cameras[cam[2]] = [cam[4], cam[5], cam[6], cam[7], cam[8], cam[9]]
    meta = {"jurisdictions": jurisdictions, "routes": routes, "cameras": meta_cameras}
    meta_path = os.path.join(os.path.dirname(OUTPUT), "meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, separators=(",", ":"))

    size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
    print(f"\n  Output: {OUTPUT}")
    print(f"  States: {len(states)}")
    print(f"  Cameras: {len(cameras)}")
    print(f"  Size: {size_mb:.2f} MB")
    print(f"  Also generated: pins.json ({len(pins)} pins), meta.json ({len(meta_cameras)} entries)")


if __name__ == "__main__":
    print("Building cameras.db.json...")
    build_db()
    print("Done!")
