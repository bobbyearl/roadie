#!/usr/bin/env python3
"""
Refresh camera data from live sources.

Usage:
    python3 scripts/refresh-all.py              # Refresh all states
    python3 scripts/refresh-all.py sc va wi     # Refresh specific states
    python3 scripts/refresh-all.py --api-only   # Skip states that need Playwright
    python3 scripts/refresh-all.py --check      # Health check only (no data refresh)

After refreshing, run build-db.py to regenerate the public data files.
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data-sources"

# State registry: how to fetch each state's data
# type: "api" (public HTTP, no browser), "511" (needs Playwright for cookies),
#       "local" (no known live endpoint, manual capture only)
STATE_SOURCES = {
    "ak": {"type": "511", "fetcher": "platform_511"},
    "al": {"type": "api", "fetcher": "api_states", "func": "fetch_al"},
    "ar": {"type": "api", "fetcher": "api_states", "func": "fetch_ar"},
    "ca": {"type": "api", "fetcher": "api_states", "func": "fetch_ca"},
    "ct": {"type": "local", "note": "No known public API - captured from ctroads.org browser session"},
    "de": {"type": "local", "note": "No known public API - captured from deldot.gov browser session"},
    "fl": {"type": "api", "fetcher": "api_states", "func": "fetch_fl"},
    "ga": {"type": "local", "note": "511ga.org API returns 400 - needs investigation"},
    "id": {"type": "511", "fetcher": "platform_511"},
    "la": {"type": "511", "fetcher": "platform_511"},
    "md": {"type": "local", "note": "No known public API - captured from chart.maryland.gov"},
    "nc": {"type": "local", "note": "No known public API - captured from drivenc.gov browser session"},
    "nd": {"type": "api", "fetcher": "api_states", "func": "fetch_nd"},
    "ne": {"type": "511", "fetcher": "platform_511"},
    "nj": {"type": "local", "note": "511nj.org returns 403 - bot protection added"},
    "nv": {"type": "511", "fetcher": "platform_511"},
    "ny": {"type": "511", "fetcher": "platform_511"},
    "pa": {"type": "local", "note": "No known public API - captured from 511pa.com browser session"},
    "sc": {"type": "api", "fetcher": "api_states", "func": "fetch_sc"},
    "tn": {"type": "local", "note": "smartway.tn.gov switched to SPA - API endpoint gone"},
    "ut": {"type": "local", "note": "No known public API - captured from udottraffic.utah.gov"},
    "va": {"type": "local", "note": "va.cdn.iteris-atis.com DNS changed - needs new domain"},
    "wi": {"type": "511", "fetcher": "platform_511"},
}


async def refresh_api_state(state_id: str, config: dict) -> tuple[str, bool, str]:
    """Refresh a state that uses a public API."""
    from fetchers import api_states

    func_name = config["func"]
    func = getattr(api_states, func_name)
    try:
        cameras = await func()
        output_path = DATA_DIR / f"{state_id}.json"
        cameras = _merge_cameras(output_path, cameras)

        with open(output_path, "w") as f:
            json.dump(cameras, f, indent=2)

        return state_id, True, f"{len(cameras)} cameras"
    except Exception as e:
        return state_id, False, str(e)


async def refresh_511_state(state_id: str) -> tuple[str, bool, str]:
    """Refresh a state that uses the 511 platform (needs Playwright)."""
    from fetchers.platform_511 import fetch_state

    try:
        cameras = await fetch_state(state_id)
        output_path = DATA_DIR / f"{state_id}.json"

        with open(output_path, "w") as f:
            json.dump(cameras, f, indent=2)
        return state_id, True, f"{len(cameras)} cameras"
    except Exception as e:
        return state_id, False, str(e)


def _merge_cameras(output_path: Path, new_cameras: list[dict]) -> list[dict]:
    """Merge new cameras into existing data. Updates existing, adds new, never removes.

    This prevents data loss when an API returns fewer cameras than we previously had.
    Only merges if existing data is in normalized format (list of {id, ...} dicts).
    """
    if not output_path.exists() or not new_cameras:
        return new_cameras

    try:
        with open(output_path) as f:
            existing = json.load(f)
    except (json.JSONDecodeError, IOError):
        return new_cameras

    # Only merge if existing is a normalized list with 'id' fields
    if not isinstance(existing, list) or not existing or not isinstance(existing[0], dict) or "id" not in existing[0]:
        return new_cameras

    # Build lookup by ID
    existing_map = {str(cam.get("id", "")): cam for cam in existing}
    new_map = {str(cam.get("id", "")): cam for cam in new_cameras}

    # Update existing with new data, add new cameras
    merged_map = {**existing_map, **new_map}
    merged = list(merged_map.values())

    added = len(merged) - len(existing)
    if added > 0:
        print(f"    (+{added} new cameras)")

    return merged


async def health_check() -> list[dict]:
    """Check if each state's test camera image is accessible (200, not 301/404)."""
    import httpx

    # Sample one image URL per state
    test_urls = {
        "ak": "https://511.alaska.gov/map/Cctv/1",
        "al": "https://api.algotraffic.com/v4/Cameras/1845/snapshot.jpg",
        "ca": "https://cwwp2.dot.ca.gov/data/d3/cctv/image/hwy50pioneer/hwy50pioneer.jpg",
        "ct": "https://ctroads.org/map/Cctv/1",
        "de": "https://deldot.gov/map/Cctv/1",
        "fl": "https://fl511.com/map/Cctv/1",
        "ga": "https://511ga.org/map/Cctv/1",
        "id": "https://511.idaho.gov/map/Cctv/1",
        "la": "https://511la.org/map/Cctv/1",
        "md": "https://chart.maryland.gov/video/jpeg/CCTV-SKYLINE",
        "nc": "https://drivenc.gov/map/Cctv/1",
        "ne": "https://newengland511.org/map/Cctv/1",
        "nj": "https://511nj.org/map/Cctv/1",
        "nv": "https://www.nvroads.com/map/Cctv/1",
        "ny": "https://511ny.org/map/Cctv/1",
        "pa": "https://www.511pa.com/map/Cctv/1",
        "sc": "https://scdotsnap.us-east-1.skyvdn.com/50001.png",
        "tn": "https://tnsnapshots.com/R1_010.png",
        "ut": "https://www.udottraffic.utah.gov/map/Cctv/136011",
        "va": "https://www.511virginia.org/map/Cctv/1",
        "wi": "https://511wi.gov/map/Cctv/1",
    }

    results = []
    async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
        for state_id, url in sorted(test_urls.items()):
            try:
                # Use GET with stream to avoid HEAD 405 errors, but don't download body
                resp = await client.get(url, headers={"Range": "bytes=0-0"})
                # Accept 200 or 206 (partial content) as success
                status = resp.status_code
                ok = status in (200, 206)
                note = ""
                if status == 301:
                    note = f"REDIRECT -> {resp.headers.get('location', '?')}"
                elif status == 404:
                    note = "NOT FOUND"
                elif status not in (200, 206):
                    note = f"HTTP {status}"
                results.append({"state": state_id, "ok": ok, "status": status, "note": note, "url": url})
            except Exception as e:
                results.append({"state": state_id, "ok": False, "status": 0, "note": str(e), "url": url})

    return results


async def main():
    parser = argparse.ArgumentParser(description="Refresh camera data from live sources")
    parser.add_argument("states", nargs="*", help="Specific states to refresh (default: all)")
    parser.add_argument("--api-only", action="store_true", help="Skip states that need Playwright")
    parser.add_argument("--check", action="store_true", help="Health check only (no data refresh)")
    args = parser.parse_args()

    if args.check:
        print("Running health check...\n")
        results = await health_check()
        ok_count = sum(1 for r in results if r["ok"])
        fail_count = len(results) - ok_count

        for r in results:
            icon = "✅" if r["ok"] else "❌"
            line = f"  {icon} {r['state'].upper():3s} [{r['status']}]"
            if r["note"]:
                line += f"  {r['note']}"
            print(line)

        print(f"\n{ok_count}/{len(results)} passing, {fail_count} failing")
        sys.exit(0 if fail_count == 0 else 1)

    # Determine which states to refresh
    states_to_refresh = args.states if args.states else list(STATE_SOURCES.keys())

    print(f"Refreshing {len(states_to_refresh)} states...\n")
    results = []
    start = time.time()

    for state_id in sorted(states_to_refresh):
        if state_id not in STATE_SOURCES:
            print(f"  ⚠️  {state_id.upper()} - unknown state, skipping")
            continue

        config = STATE_SOURCES[state_id]

        if config["type"] == "local":
            print(f"  ⏭️  {state_id.upper()} - manual only ({config['note']})")
            results.append((state_id, None, "manual"))
            continue

        if config["type"] == "511" and args.api_only:
            print(f"  ⏭️  {state_id.upper()} - skipped (needs Playwright, --api-only set)")
            results.append((state_id, None, "skipped"))
            continue

        print(f"  🔄 {state_id.upper()}...", end=" ", flush=True)

        if config["type"] == "api":
            state_id, success, msg = await refresh_api_state(state_id, config)
        elif config["type"] == "511":
            state_id, success, msg = await refresh_511_state(state_id)
        else:
            success, msg = False, "unknown type"

        icon = "✅" if success else "❌"
        print(f"{icon} {msg}")
        results.append((state_id, success, msg))

    elapsed = time.time() - start
    successes = sum(1 for _, s, _ in results if s is True)
    failures = sum(1 for _, s, _ in results if s is False)
    skipped = sum(1 for _, s, _ in results if s is None)

    print(f"\nDone in {elapsed:.1f}s: {successes} refreshed, {failures} failed, {skipped} skipped")

    if failures > 0:
        print("\nFailed states:")
        for state_id, success, msg in results:
            if success is False:
                print(f"  {state_id.upper()}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    # Add scripts dir to path so fetchers module is importable
    sys.path.insert(0, str(SCRIPT_DIR))
    asyncio.run(main())
