import './CameraMap.css';

import { AdvancedMarker, APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { GripVertical, Home, Locate, BoxSelect, Layers } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Supercluster from 'supercluster';

import { type Camera, getStateConfig } from '../lib/cameras';
import { track } from '../lib/analytics';
import { useTheme } from '../lib/ThemeContext';
import { useTraffic } from '../lib/TrafficContext';
import { CameraCard } from './CameraCard';
import { CameraMedia } from './CameraMedia';

interface CameraMapProps {
  stateId: string;
  markersOnly?: boolean;
}

export function CameraMap({ stateId, markersOnly }: CameraMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';

  if (!apiKey) {
    return (
      <div className="empty-state">
        <p className="empty-title">Map view requires a Google Maps API key</p>
        <p className="empty-desc">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapInner mapId={mapId} stateId={stateId} markersOnly={markersOnly} />
    </APIProvider>
  );
}


/**
 * Real-time Google traffic overlay. @vis.gl/react-google-maps 1.8.x ships no
 * <TrafficLayer> wrapper, so attach the raw google.maps.TrafficLayer via useMap.
 * Helps users pick which camera to open by showing congestion on the roads.
 */
function TrafficLayer() {
  const map = useMap();
  useEffect(() => {
    if (!map || !window.google?.maps) return;
    const layer = new google.maps.TrafficLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map]);
  return null;
}

/* ── Camera marker design system ──────────────────────────────────────────
 * Individual cameras render as teardrop pins colored by media type. The pair is
 * two analogous, equally-saturated hues (video vs image) — NOT light/dark shades
 * of one hue (a pale shade read as "disabled"). Colors are SCHEME-AWARE: the
 * light basemap and the dark basemap need different hues to stay legible over
 * the fixed Google traffic palette (green/amber/red/maroon, same in both modes).
 *   LIGHT: violet + indigo (reads on the pale basemap).
 *   DARK:  bright cyan + bright indigo (high-luminance so it lifts off the dark
 *          road and doesn't drown in the green congestion band).
 * SELECTED cameras are the loud pink #e836b8 (.map-pin-active, unchanged).
 * Clusters render as round slate bubbles sized by count (an aggregate, not a pin).
 * Wow-mode (clustering off) renders small dots: shadow-only on LIGHT (a big border
 * chokes a tiny dot's color), but with a thin light ring on DARK so they don't
 * vanish on a dark road. Teardrops always carry a white border for traffic contrast.
 */
type MarkerColors = { video: string; image: string; videoRgb: [number, number, number]; imageRgb: [number, number, number] };
const MARKER_LIGHT: MarkerColors = {
  video: '#7c3aed', videoRgb: [124, 58, 237],   // violet-600
  image: '#4f46e5', imageRgb: [79, 70, 229],     // indigo-600
};
const MARKER_DARK: MarkerColors = {
  video: '#22d3ee', videoRgb: [34, 211, 238],    // cyan-400 (bright, lifts off dark)
  image: '#818cf8', imageRgb: [129, 140, 248],   // indigo-400 (bright analogous neighbor)
};
const markerColors = (isDark: boolean): MarkerColors => (isDark ? MARKER_DARK : MARKER_LIGHT);

const CLUSTER_LIGHT = '#d946ef'; // fuchsia-500 — light basemap
const CLUSTER_DARK = '#e879f9';  // fuchsia-400 — brighter, lifts off dark basemap (same delta as markers)
const clusterColor = (isDark: boolean): string => (isDark ? CLUSTER_DARK : CLUSTER_LIGHT);
// Groups smaller than this render as individual teardrops, not a count bubble.
// (supercluster minPoints: a "cluster" needs at least this many points.)
const CLUSTER_MIN_POINTS = 10;

// Build a teardrop-pin SVG data-URI (fill = media color, white stroke). Authored
// at 120px (viewBox stays 0 0 22 22, so shape is identical) so deck.gl's atlas has
// 4x the pixels and DOWNSAMPLES to the 30px display size — crisp, not mushy.
function teardropIcon(fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 22 22"><path d="M11 1C6.6 1 3 4.5 3 8.8c0 5.9 8 12.2 8 12.2s8-6.3 8-12.2C19 4.5 15.4 1 11 1z" fill="${fill}" stroke="#fff" stroke-width="1.6"/><circle cx="11" cy="8.6" r="3" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
// Wispy cluster bubble — all ONE hue (fuchsia) at graduated opacity so there's no
// grey conflicting with the core: a faint outer halo, a mid ring, and a
// semi-transparent core (not solid, so it reads as a density cloud). Authored at
// 208px (viewBox stays 52) for the same downsample-for-crispness reason.
function clusterIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="208" height="208" viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" fill="${color}" fill-opacity="0.7"/><circle cx="26" cy="26" r="15" fill="${color}" fill-opacity="0.8"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
// Cluster bubble pixel size grows with member count (wide ramp for clear magnitude).
function clusterSize(count: number): number {
  if (count >= 1000) return 64;
  if (count >= 250) return 54;
  if (count >= 100) return 46;
  if (count >= 50) return 38;
  return 30;
}

function MapInner({ mapId, stateId, markersOnly }: { mapId: string; stateId: string; markersOnly?: boolean }) {
  const map = useMap();
  const { cameras, selectedIds, selectedCameras, toggleCamera, selectRoute, clearAll, mode, setMode, cardSize, setDetailCam, layoutKey, userLocation, setUserLocation, mapPosition, setMapPosition } = useTraffic();
  const { resolvedTheme } = useTheme();
  // Clustering toggle (default ON for usability). Off = "wow-mode" sea of dots.
  // Synced to the ?cluster URL param (cluster=0 when off) so a view is shareable.
  const [clustered, setClusteredState] = useState(() => {
    return new URLSearchParams(window.location.search).get('cluster') !== '0';
  });
  const setClustered = useCallback((on: boolean) => {
    setClusteredState(on);
    const url = new URL(window.location.href);
    if (on) { url.searchParams.delete('cluster'); } else { url.searchParams.set('cluster', '0'); }
    window.history.replaceState(null, '', url.toString());
  }, []);
  const clusteredRef = useRef(clustered);
  clusteredRef.current = clustered;
  const [reshowTick, setReshowTick] = useState(0);
  const prevStateRef = useRef(stateId);
  // Set map position from URL on mount, or default center/zoom on state change
  const initialPositionApplied = useRef(false);
  useEffect(() => {
    if (!map) return;
    if (!initialPositionApplied.current && mapPosition) {
      map.setCenter({ lat: mapPosition.lat, lng: mapPosition.lng });
      map.setZoom(mapPosition.z);
      initialPositionApplied.current = true;
    } else if (stateId !== prevStateRef.current) {
      const config = getStateConfig(stateId);
      map.setCenter(config.defaultCenter);
      map.setZoom(config.defaultZoom);
      prevStateRef.current = stateId;
    }
  }, [map, stateId, mapPosition]);

  // Save map position to URL on idle (debounced)
  useEffect(() => {
    if (!map) return;
    let timeout: ReturnType<typeof setTimeout>;
    const listener = map.addListener('idle', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (center && zoom != null) {
          setMapPosition(center.lat(), center.lng(), zoom);
        }
      }, 500);
    });
    return () => { clearTimeout(timeout); google.maps.event.removeListener(listener); };
  }, [map, setMapPosition]);

  const [offsets, setOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const prevSelectedRef = useRef<Set<string>>(new Set());
  const lastLayoutKeyRef = useRef(layoutKey);

  const cardWidthPx = cardSize === 'sm' ? 200 : cardSize === 'lg' ? 500 : 340;

  useEffect(() => {
    // If layoutKey changed, force re-layout by clearing prevSelected
    const isManualLayout = layoutKey !== lastLayoutKeyRef.current;
    if (isManualLayout) {
      prevSelectedRef.current = new Set();
      lastLayoutKeyRef.current = layoutKey;
    }

    const newIds = [...selectedIds].filter((id) => !prevSelectedRef.current.has(id));
    if (newIds.length <= 1) {
      prevSelectedRef.current = new Set(selectedIds);
      return;
    }

    const newCams = newIds.map((id) => cameras.find((c) => c.id === id)).filter(Boolean) as Camera[];
    if (!map || newCams.length === 0) {
      return;
    }

    prevSelectedRef.current = new Set(selectedIds);

    const cardW = cardWidthPx;
    const cardH = cardWidthPx * 0.75 + 50;

    // Only fitBounds on initial selection, not manual re-layout
    // Skip in split/both view (markersOnly) - list handles camera display, don't move map
    if (!isManualLayout && !markersOnly) {
      // Skip fitBounds if URL already has a map position (user is restoring a shared/bookmarked view)
      if (mapPosition && !prevSelectedRef.current.size) {
        prevSelectedRef.current = new Set(selectedIds);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      for (const cam of newCams) {
        bounds.extend({ lat: cam.lat, lng: cam.lng });
      }
      const padding = markersOnly ? 40 : { top: cardH + 80, bottom: 80, left: cardW / 2 + 40, right: cardW / 2 + 40 };
      map.fitBounds(bounds, padding);
    }

    // Skip layout computation in markersOnly mode (no card overlays to position)
    if (markersOnly) {
      return;
    }

    const runLayout = () => {
      const projection = map.getProjection();
      if (!projection) {
        return;
      }
      const zoom = map.getZoom() ?? 10;
      const scale = Math.pow(2, zoom);
      const mapBounds = map.getBounds();
      if (!mapBounds) {
        return;
      }

      const topLeft = projection.fromLatLngToPoint(
        new google.maps.LatLng(mapBounds.getNorthEast().lat(), mapBounds.getSouthWest().lng()),
      )!;
      const toPixel = (lat: number, lng: number) => {
        const worldPoint = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng))!;
        return { x: (worldPoint.x - topLeft.x) * scale, y: (worldPoint.y - topLeft.y) * scale };
      };

      const camPixels = newCams.map((cam) => ({ cam, pixel: toPixel(cam.lat, cam.lng) }));
      const centroidX = camPixels.reduce((s, c) => s + c.pixel.x, 0) / camPixels.length;
      const centroidY = camPixels.reduce((s, c) => s + c.pixel.y, 0) / camPixels.length;
      camPixels.sort(
        (a, b) =>
          Math.atan2(a.pixel.y - centroidY, a.pixel.x - centroidX) -
          Math.atan2(b.pixel.y - centroidY, b.pixel.x - centroidX),
      );

      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      for (const { pixel } of camPixels) {
        placed.push({ x: pixel.x - 8, y: pixel.y - 8, w: 16, h: 16 });
      }

      const overlaps = (x: number, y: number) => {
        for (const p of placed) {
          if (x < p.x + p.w + 8 && x + cardW + 8 > p.x && y < p.y + p.h + 8 && y + cardH + 8 > p.y) {
            return true;
          }
        }
        return false;
      };

      const newOffsets = new Map<string, { x: number; y: number }>();
      for (const { cam, pixel } of camPixels) {
        let bestX = 0,
          bestY = -(cardH + 20),
          found = false;
        for (let dist = cardH * 0.6; dist < cardH * 8 && !found; dist += cardH * 0.3) {
          for (let a = 0; a < 16; a++) {
            const angle = (Math.PI * 2 * a) / 16 - Math.PI / 2;
            const cx = Math.cos(angle) * dist,
              cy = Math.sin(angle) * dist;
            if (!overlaps(pixel.x + cx, pixel.y + cy)) {
              bestX = cx;
              bestY = cy;
              found = true;
              break;
            }
          }
        }
        placed.push({ x: pixel.x + bestX, y: pixel.y + bestY, w: cardW, h: cardH });
        newOffsets.set(cam.id, { x: bestX, y: bestY });
      }

      setOffsets((prev) => {
        const next = new Map(prev);
        for (const [id, o] of newOffsets) {
          next.set(id, o);
        }
        return next;
      });
    };

    if (isManualLayout) {
      runLayout();
    } else {
      const listener = map.addListener('idle', () => {
        listener.remove();
        runLayout();
      });
    }
  }, [selectedIds, map, cameras, cardWidthPx, layoutKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = offsets.get(id) ?? { x: cardWidthPx * 0.15, y: -(cardWidthPx * 0.7 + 20) };
    setDragging({ id, startX: e.clientX, startY: e.clientY, ox: existing.x, oy: existing.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) {
      return;
    }
    e.stopPropagation();
    didDragRef.current = true;
    setOffsets((prev) => {
      const next = new Map(prev);
      next.set(dragging.id, {
        x: dragging.ox + (e.clientX - dragging.startX),
        y: dragging.oy + (e.clientY - dragging.startY),
      });
      return next;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) {
      return;
    }
    e.stopPropagation();
    setDragging(null);
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const handleMarkerClick = useCallback((id: string) => {
    if (!didDragRef.current) {
      toggleCamera(id);
    }
  }, [toggleCamera]);

  const [visibleBounds, setVisibleBounds] = useState<{ n: number; s: number; e: number; w: number } | null>(null);

  const handleCameraChange = () => {
    if (!map) { return; }
    const b = map.getBounds();
    if (b) {
      setVisibleBounds({ n: b.getNorthEast().lat(), s: b.getSouthWest().lat(), e: b.getNorthEast().lng(), w: b.getSouthWest().lng() });
    }
  };

  // Trigger initial bounds when map becomes ready
  useEffect(() => {
    if (map) {
      const listener = map.addListener('idle', () => { handleCameraChange(); listener.remove(); });
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCameras = visibleBounds
    ? cameras.filter((cam) => selectedIds.has(cam.id) || (cam.lat <= visibleBounds.n && cam.lat >= visibleBounds.s && cam.lng <= visibleBounds.e && cam.lng >= visibleBounds.w))
    : cameras.filter((cam) => selectedIds.has(cam.id));

  // deck.gl overlay for all markers (WebGL, handles thousands instantly)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const deckOverlayRef = useRef<any>(null);
  const deckModulesRef = useRef<{ GoogleMapsOverlay: any; ScatterplotLayer: any; IconLayer: any } | null>(null);
  const superRef = useRef<any>(null);
  const handleMarkerClickRef = useRef(handleMarkerClick);
  handleMarkerClickRef.current = handleMarkerClick; // eslint-disable-line react-hooks/refs
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  useEffect(() => {
    if (!map || cameras.length === 0) { return; }

    let idleListener: any = null;
    let cancelled = false;

    const run = async () => {
      if (!deckModulesRef.current) {
        const [gm, layers] = await Promise.all([import('@deck.gl/google-maps'), import('@deck.gl/layers')]);
        deckModulesRef.current = { GoogleMapsOverlay: gm.GoogleMapsOverlay, ScatterplotLayer: layers.ScatterplotLayer, IconLayer: layers.IconLayer };
      }
      if (cancelled) { return; }
      const currentCameras = camerasRef.current;
      if (currentCameras.length === 0) { return; }

      const { GoogleMapsOverlay, ScatterplotLayer, IconLayer } = deckModulesRef.current;

      // One code path for both modes: cameras are ALWAYS teardrops. The toggle
      // only controls whether nearby cameras collapse into count-clouds — modeled
      // as supercluster minPoints (Infinity = never cluster = all leaf teardrops).
      const effMinPoints = clusteredRef.current ? CLUSTER_MIN_POINTS : Infinity;
      const buildIndex = () => {
        const idx = new Supercluster({ radius: 90, maxZoom: 16, minPoints: effMinPoints });
        idx.load(currentCameras.map((c: any) => ({
          type: 'Feature',
          properties: { cameraId: c.id, hasVideo: c.hasVideo },
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        })));
        return idx;
      };
      // Rebuild when the camera set changes OR the clustering mode flips (both are
      // infrequent — never on pan/zoom, so no churn).
      if (!superRef.current || superRef.current._n !== currentCameras.length || superRef.current._mp !== effMinPoints) {
        superRef.current = buildIndex();
        superRef.current._n = currentCameras.length;
        superRef.current._mp = effMinPoints;
      }

      // Selected cameras are drawn by the pink numbered AdvancedMarker, so exclude
      // them from the deck layer (otherwise a plain teardrop draws under the pin,
      // or they get swallowed into a cluster count).
      const selSet = selectedIdsRef.current;

      const isDark = resolvedTheme === 'dark';
      const colors = markerColors(isDark);

      // Assemble the camera layer. Query supercluster for the viewport + zoom;
      // with minPoints=Infinity (toggle off) everything comes back as leaf teardrops.
      const cameraLayers = (): any[] => {
        const zoom = Math.round(map.getZoom() ?? 4);
        const b = map.getBounds();
        const bbox: [number, number, number, number] = b
          ? [b.getSouthWest().lng(), b.getSouthWest().lat(), b.getNorthEast().lng(), b.getNorthEast().lat()]
          : [-180, -85, 180, 85];
        const feats = superRef.current.getClusters(bbox, zoom);

        const iconData = feats
          .filter((f: any) => f.properties.cluster || !selSet.has(f.properties.cameraId))
          .map((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          if (f.properties.cluster) {
            const count = f.properties.point_count;
            return { lng, lat, cluster: true, clusterId: f.properties.cluster_id, count, icon: clusterIcon(clusterColor(isDark)), size: clusterSize(count) };
          }
          const hasVideo = f.properties.hasVideo;
          return { lng, lat, cluster: false, cameraId: f.properties.cameraId, icon: teardropIcon(hasVideo ? colors.video : colors.image), size: 30 };
        });

        return [new IconLayer({
          id: 'cameras-icons',
          data: iconData,
          getPosition: (d: any) => [d.lng, d.lat],
          getIcon: (d: any) => (d.cluster
            ? { url: d.icon, width: 208, height: 208, anchorY: 104 }
            : { url: d.icon, width: 120, height: 120, anchorY: 120 }),
          getSize: (d: any) => d.size,
          sizeUnits: 'pixels' as const,
          pickable: true,
          onHover: (info: any) => {
            const wrapper = map.getDiv().closest('.map-wrapper');
            if (wrapper) { (wrapper as HTMLElement).classList.toggle('map-pointer', !!info.object); }
          },
          onClick: (info: any) => { if (info.object) { handleClusterOrCamera(info.object, zoom); } },
        })];
      };

      // Click routing: a cluster zooms to expand; a camera opens (with the
      // legacy overlap-zoom fallback for wow-mode dots stacked at low zoom).
      const handleClusterOrCamera = (obj: any, zoom: number) => {
        if (obj.cluster) {
          const expansion = superRef.current.getClusterExpansionZoom(obj.clusterId);
          map.panTo({ lat: obj.lat, lng: obj.lng });
          map.setZoom(Math.min(expansion, 18));
          return;
        }
        const id = obj.cameraId ?? obj.id;
        if (!clusteredRef.current) {
          // wow-mode overlap fallback
          const threshold = 0.5 / Math.pow(2, zoom - 5);
          const nearby = camerasRef.current.filter((c: any) =>
            Math.abs(c.lat - obj.lat) < threshold && Math.abs(c.lng - obj.lng) < threshold);
          if (nearby.length > 1 && zoom < 15) {
            map.panTo({ lat: obj.lat, lng: obj.lng });
            map.setZoom(Math.min(zoom + 3, 17));
            return;
          }
        }
        handleMarkerClickRef.current(id);
      };

      // Rebuild layers now and on every idle (zoom/pan changes cluster shape).
      const render = () => {
        const layers: any[] = cameraLayers();
        if (userLocation) {
          layers.push(new ScatterplotLayer({
            id: 'user-location',
            data: [userLocation],
            getPosition: (d: any) => [d.lng, d.lat],
            getRadius: 8,
            radiusUnits: 'pixels' as const,
            getFillColor: [37, 99, 235, 255] as any,
            getLineColor: [255, 255, 255, 255] as any,
            lineWidthMinPixels: 2,
            stroked: true,
            pickable: false,
          }));
        }
        if (!deckOverlayRef.current || deckOverlayRef.current._map !== map) {
          if (deckOverlayRef.current) { deckOverlayRef.current.setMap(null); }
          // interleaved:false composites deck as a plane ON TOP of the vector
          // basemap (incl. road/place labels) so markers are never drawn under
          // labels. Interleaved (the default) obeys the map's internal draw order,
          // which lets labels paint over overlay geometry.
          const overlay = new GoogleMapsOverlay({ layers, interleaved: false });
          overlay.setMap(map);
          (overlay as any)._map = map;
          deckOverlayRef.current = overlay;
        } else {
          deckOverlayRef.current.setProps({ layers });
        }
      };
      if (cancelled) { return; }
      render();
      idleListener = map.addListener('idle', render);
    };
    run();
    return () => { cancelled = true; if (idleListener) { idleListener.remove(); } };
  }, [map, cameras, resolvedTheme, userLocation, clustered, reshowTick, selectedIds]);

  // Hide/show deck.gl layers during split resize to prevent flicker.
  // Reshow just re-runs the main render effect (via a tick) so it rebuilds with
  // the current cluster/zoom state rather than duplicating the layer builder.
  useEffect(() => {
    const hide = () => {
      if (deckOverlayRef.current) { deckOverlayRef.current.setProps({ layers: [] }); }
    };
    const reshow = () => { setReshowTick((t) => t + 1); };
    window.addEventListener('deckHide', hide);
    window.addEventListener('deckReshow', reshow);
    return () => { window.removeEventListener('deckHide', hide); window.removeEventListener('deckReshow', reshow); };
  }, []);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (deckOverlayRef.current) {
        deckOverlayRef.current.setMap(null);
        deckOverlayRef.current = null;
      }
    };
  }, []);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const selectedCamerasInView = visibleCameras.filter((cam) => selectedIds.has(cam.id));

  // Map camera id -> 1-based selection index (matches order in split panel)
  const selectionIndex = new Map(selectedCameras.map((cam, i) => [cam.id, i + 1]));

  const handleLocate = () => {
    if (!navigator.geolocation || !map) { return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map.panTo(loc);
        map.setZoom(12);
      },
      () => { /* silently fail if denied */ }
    );
  };

  // --- Draw-to-select (lasso) ---
  const [selectMode, setSelectMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [drawRect, setDrawRect] = useState<{ startX: number; startY: number; x: number; y: number; w: number; h: number } | null>(null);
  const [drawCount, setDrawCount] = useState(0);
  const drawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Disable map dragging when in select mode
  useEffect(() => {
    if (!map) return;
    map.setOptions({ gestureHandling: selectMode ? 'none' : 'auto' });
  }, [map, selectMode]);

  const handleDrawStart = useCallback((e: React.PointerEvent) => {
    if (!selectMode) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startPointRef.current = { x, y };
    drawingRef.current = true;
    setDrawRect({ startX: x, startY: y, x, y, w: 0, h: 0 });
    setDrawCount(0);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [selectMode]);

  const handleDrawMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current || !startPointRef.current) return;
    e.preventDefault();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const target = e.currentTarget;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const curX = clientX - rect.left;
      const curY = clientY - rect.top;
      if (!startPointRef.current) return;
      const sx = startPointRef.current.x;
      const sy = startPointRef.current.y;
      const newRect = {
        startX: sx, startY: sy,
        x: Math.min(sx, curX),
        y: Math.min(sy, curY),
        w: Math.abs(curX - sx),
        h: Math.abs(curY - sy),
      };
      setDrawRect(newRect);

      // Count cameras in the drawn rect (use all cameras for accurate limit)
      if (map && map.getBounds()) {
        const bounds = map.getBounds()!;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const nwLat = ne.lat() - (newRect.y / rect.height) * (ne.lat() - sw.lat());
        const nwLng = sw.lng() + (newRect.x / rect.width) * (ne.lng() - sw.lng());
        const seLat = ne.lat() - ((newRect.y + newRect.h) / rect.height) * (ne.lat() - sw.lat());
        const seLng = sw.lng() + ((newRect.x + newRect.w) / rect.width) * (ne.lng() - sw.lng());
        let count = 0;
        for (let i = 0; i < cameras.length; i++) {
          const cam = cameras[i];
          if (cam.lat <= nwLat && cam.lat >= seLat && cam.lng >= nwLng && cam.lng <= seLng) count++;
          if (count > 50) break; // Stop counting past the limit
        }
        setDrawCount(count);
      }
    });
  }, [map, cameras]);

  const handleDrawEnd = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current || !startPointRef.current || !map) {
      drawingRef.current = false;
      setDrawRect(null);
      return;
    }
    e.preventDefault();
    drawingRef.current = false;

    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const sx = startPointRef.current.x;
    const sy = startPointRef.current.y;

    // Only process if dragged at least 10px
    if (Math.abs(curX - sx) < 10 || Math.abs(curY - sy) < 10) {
      setDrawRect(null);
      startPointRef.current = null;
      if (selectMode) setSelectMode(false);
      return;
    }

    // Convert pixel bounds to lat/lng
    const projection = map.getProjection();
    const bounds = map.getBounds();
    if (!projection || !bounds) { setDrawRect(null); if (selectMode) setSelectMode(false); return; }

    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast())!;
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest())!;
    const scale = Math.pow(2, map.getZoom()!);

    const pixelToLatLng = (px: number, py: number) => {
      const worldPoint = new google.maps.Point(
        bottomLeft.x + (px / scale) * (topRight.x - bottomLeft.x) / rect.width * scale,
        topRight.y + (py / scale) * (bottomLeft.y - topRight.y) / rect.height * scale
      );
      // Simpler approach: use overlay projection or just compute from bounds
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const lat = ne.lat() - (py / rect.height) * (ne.lat() - sw.lat());
      const lng = sw.lng() + (px / rect.width) * (ne.lng() - sw.lng());
      return { lat, lng };
    };

    const minX = Math.min(sx, curX);
    const maxX = Math.max(sx, curX);
    const minY = Math.min(sy, curY);
    const maxY = Math.max(sy, curY);

    const nw = pixelToLatLng(minX, minY);
    const se = pixelToLatLng(maxX, maxY);

    // Find all cameras within the rectangle
    const MAX_DRAW_SELECT = 50;
    const selectedInRect = cameras.filter(cam =>
      cam.lat <= nw.lat && cam.lat >= se.lat &&
      cam.lng >= nw.lng && cam.lng <= se.lng
    ).map(cam => cam.id);

    if (selectedInRect.length > 0 && selectedInRect.length <= MAX_DRAW_SELECT) {
      // Add to existing selection
      const merged = new Set([...selectedIds, ...selectedInRect]);
      selectRoute([...merged]);
      track('draw_select', { camera_count: selectedInRect.length });
    }

    setDrawRect(null);
    startPointRef.current = null;
    if (selectMode) setSelectMode(false);
  }, [map, cameras, selectedIds, selectRoute, selectMode, visibleCameras]);

  // Shift key listener for power-user shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Ignore when modifier keys held (except Shift for ?)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (['Escape', 's', 'h', 'l', 'x', 'i', '?'].includes(e.key)) {
        track('keyboard_shortcut', { key: e.key });
      }

      switch (e.key) {
        case 'Escape':
          if (selectMode) setSelectMode(false);
          if (showShortcuts) setShowShortcuts(false);
          break;
        case 's':
          setSelectMode(m => !m);
          break;
        case 'h':
          if (map) { const config = getStateConfig(stateId); map.panTo(config.defaultCenter); map.setZoom(config.defaultZoom); }
          break;
        case 'l':
          handleLocate();
          break;
        case 'x':
          clearAll();
          break;
        case 'i':
          setMode(mode === 'image' ? undefined : 'image');
          break;
        case '?':
          setShowShortcuts(v => !v);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMode, showShortcuts, map, stateId, mode]);

  // Pan to show user location + closest camera when findClosest/locate triggers
  const prevUserLocation = useRef(userLocation);
  useEffect(() => {
    if (!map || !userLocation) { return; }
    // Only act when userLocation actually changed (not on every selectedCameras update)
    if (prevUserLocation.current === userLocation && markersOnly) { return; }
    prevUserLocation.current = userLocation;
    if (selectedCameras.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userLocation);
      selectedCameras.slice(-1).forEach((cam) => bounds.extend({ lat: cam.lat, lng: cam.lng }));
      map.fitBounds(bounds, 60);
    } else {
      map.panTo(userLocation);
      map.setZoom(12);
    }
  }, [map, userLocation, selectedCameras, markersOnly]);

  return (
    <div className="map-wrapper">
      <GoogleMap
      defaultCenter={mapPosition ? { lat: mapPosition.lat, lng: mapPosition.lng } : getStateConfig(stateId).defaultCenter}
      defaultZoom={mapPosition ? mapPosition.z : getStateConfig(stateId).defaultZoom}
      mapId={mapId}
      colorScheme={resolvedTheme === 'dark' ? 'DARK' : 'LIGHT'}
      className="map-container"
      onCameraChanged={handleCameraChange}
      streetViewControl={false}
      fullscreenControl={false}
      zoomControl={false}
      mapTypeControl={false}
      clickableIcons={false}
    >
      <TrafficLayer />
      {selectedCamerasInView.map((cam) => {
        const offset = offsets.get(cam.id);
        return (
          <AdvancedMarker
            key={cam.id}
            position={{ lat: cam.lat, lng: cam.lng }}
            onClick={() => handleMarkerClick(cam.id)}
            zIndex={100 + (selectionIndex.get(cam.id) ?? 0)}
          >
            {!markersOnly ? (
              <div className="map-feed-anchor" onClick={(e) => e.stopPropagation()}>
                <div className="map-pin-active">
                  <span className="map-pin-number">{selectionIndex.get(cam.id)}</span>
                </div>
                {(() => {
                  const ex = offset?.x ?? cardWidthPx * 0.15,
                    ey = offset?.y ?? -(cardWidthPx * 0.7 + 20);
                  return (
                    <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }}>
                      <line
                        x1="8"
                        y1="8"
                        x2={ex + 2}
                        y2={ey + 2}
                        stroke="var(--color-accent-marker)"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                    </svg>
                  );
                })()}
                <div
                  className="map-feed"
                  style={{
                    width: `${cardWidthPx}px`,
                    position: 'absolute',
                    left: offset?.x ?? cardWidthPx * 0.15,
                    top: offset?.y ?? -(cardWidthPx * 0.7 + 20),
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  <CameraCard
                    camera={cam}
                    onRemove={() => toggleCamera(cam.id)}
                    onDetail={() => setDetailCam(cam)}
                    index={selectionIndex.get(cam.id)}
                    headerLeft={<div className="map-feed-drag" onPointerDown={(e) => onPointerDown(e, cam.id)}><GripVertical size={12} /></div>}
                  >
                    <CameraMedia camera={cam} />
                  </CameraCard>
                </div>
              </div>
            ) : (
              <div className="map-pin-selected">
                <span className="map-pin-number">{selectionIndex.get(cam.id)}</span>
              </div>
            )}
          </AdvancedMarker>
        );
      })}
    </GoogleMap>
    {/* Draw-to-select overlay */}
    <div
      className={`map-draw-overlay ${selectMode ? 'map-draw-active' : ''}`}
      onPointerDown={handleDrawStart}
      onPointerMove={handleDrawMove}
      onPointerUp={handleDrawEnd}
    >
      {drawRect && drawRect.w > 0 && (
        <div className={`map-draw-rect ${drawCount > 50 ? 'map-draw-rect-over' : ''}`} style={{ left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h }}>
          {drawCount > 0 && <span className={`map-draw-count ${drawCount > 50 ? 'map-draw-count-over' : ''}`}>{drawCount > 50 ? `${drawCount} (50 max)` : drawCount}</span>}
        </div>
      )}
    </div>
    <div className="map-controls">
      <button className="map-control-btn" onClick={() => { if (!map) return; const config = getStateConfig(stateId); map.panTo(config.defaultCenter); map.setZoom(config.defaultZoom); }} data-tooltip="Reset view (H)" aria-label="Reset view">
        <Home size={18} />
      </button>
      <button className={`map-control-btn ${clustered ? 'map-control-btn-active' : ''}`} onClick={() => setClustered(!clustered)} data-tooltip={clustered ? 'Clustering on' : 'Clustering off (all cameras)'} aria-label="Toggle clustering">
        <Layers size={18} />
      </button>
      <button className="map-control-btn" onClick={handleLocate} data-tooltip="Locate me (L)" aria-label="Locate me">
        <Locate size={18} />
      </button>
      <button className={`map-control-btn ${selectMode ? 'map-control-btn-active' : ''}`} onClick={() => setSelectMode(!selectMode)} data-tooltip="Draw to select (S)" aria-label="Draw to select">
        <BoxSelect size={18} />
      </button>
    </div>
    {showShortcuts && (
      <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
        <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
          <h3>Keyboard Shortcuts</h3>
          <table>
            <tbody>
              <tr><td><kbd>S</kbd></td><td>Toggle draw-to-select</td></tr>
              <tr><td><kbd>H</kbd></td><td>Home (reset view)</td></tr>
              <tr><td><kbd>L</kbd></td><td>Locate me</td></tr>
              <tr><td><kbd>X</kbd></td><td>Clear selection</td></tr>
              <tr><td><kbd>I</kbd></td><td>Toggle force images</td></tr>
              <tr><td><kbd>Esc</kbd></td><td>Exit select mode</td></tr>
              <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    )}
    </div>
  );
}
