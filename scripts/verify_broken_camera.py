#!/usr/bin/env python3
"""Re-probe a reported broken camera and emit a markdown findings report.

Reads the issue body on stdin (or --body-file), extracts the camera id, looks it
up in the committed public/data/cameras.db.json, and HTTP-checks its image URL.
Prints a markdown report to stdout for a GitHub Action to post as an issue comment.
It NEVER modifies data — it only investigates and reports. A human decides.
"""
import argparse
import json
import os
import re
import sys
import urllib.request

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "cameras.db.json")

# Compact DB row layout (see build-db.py): [lat, lng, id, stateIdx, name, routeIdx,
# jurisdictionIdx, image_url, video_url, hasVideo].
LAT, LNG, ID, STATE, NAME, IMG, VID, HASVIDEO = 0, 1, 2, 3, 4, 7, 8, 9


def extract_camera_id(body: str) -> str | None:
    """Pull the camera id from either the issue-form field or the app-link body."""
    # Issue form renders "### Camera ID\n\nny:4822"
    m = re.search(r"###\s*Camera ID\s*\n+\s*([a-z]{2}:[^\s]+)", body, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # App Report link renders "**ID:** ny:4822"
    m = re.search(r"\*\*ID:\*\*\s*([a-z]{2}:[^\s]+)", body, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Last resort: any state:site_id token
    m = re.search(r"\b([a-z]{2}:[A-Za-z0-9_-]+)\b", body)
    return m.group(1).strip() if m else None


def http_ok(url: str, timeout: int = 15) -> tuple[bool, str]:
    if not url:
        return False, "no URL"
    try:
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "roadie-broken-camera-bot"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            length = resp.headers.get("Content-Length")
            return (200 <= code < 300), f"HTTP {code}" + (f", {length} bytes" if length else "")
    except Exception as e:  # noqa: BLE001 - report any failure verbatim
        return False, f"{type(e).__name__}: {e}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--body-file", help="file with the issue body (default: stdin)")
    args = ap.parse_args()

    body = open(args.body_file).read() if args.body_file else sys.stdin.read()
    cam_id = extract_camera_id(body)

    if not cam_id:
        print("Could not find a camera ID (expected `state:site_id`, e.g. `ny:4822`) in this report. "
              "Please add the ID so the camera can be re-checked.")
        return 0

    with open(DB_PATH) as f:
        db = json.load(f)
    row = next((c for c in db["cameras"] if c[ID] == cam_id), None)

    lines = [f"🤖 **Automated re-probe of `{cam_id}`**", ""]
    if row is None:
        lines += [
            f"- **In current data:** ❌ not found — `{cam_id}` is no longer in the shipped camera database.",
            "- This camera has likely already been removed or its id changed. A maintainer can close this if so.",
        ]
        print("\n".join(lines))
        return 0

    name = row[NAME] or "(unnamed)"
    kind = "video" if row[HASVIDEO] == 1 else "image"
    img_ok, img_detail = http_ok(row[IMG])

    lines += [
        f"- **Name:** {name}",
        f"- **Type:** {kind}",
        f"- **In current data:** ✅ present",
        f"- **Image URL:** {'✅' if img_ok else '❌'} {img_detail}",
    ]
    if row[VID]:
        lines.append(f"- **Video URL present:** ✅ (`{row[VID][:60]}…`)" if len(row[VID]) > 60 else f"- **Video URL present:** ✅")

    if img_ok:
        lines += ["", "The camera is present and its image responded just now — this may be **intermittent** rather than dead. A maintainer will take a look."]
    else:
        lines += ["", "The camera is present in the data but its image did **not** respond — it may be genuinely down. A maintainer will confirm before any removal."]

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
