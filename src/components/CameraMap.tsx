import './CameraMap.css';

import { AdvancedMarker, APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { GripVertical, Home, Locate, BoxSelect } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type Camera, getStateConfig } from '../lib/cameras';
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


function MapInner({ mapId, stateId, markersOnly }: { mapId: string; stateId: string; markersOnly?: boolean }) {
  const { cameras, selectedIds, selectedCameras, toggleCamera, selectRoute, mode, cardSize, setDetailCam, layoutKey, userLocation, setUserLocation, mapPosition, setMapPosition } = useTraffic();
  const { resolvedTheme } = useTheme();
  const map = useMap();
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
  const deckModulesRef = useRef<{ GoogleMapsOverlay: any; ScatterplotLayer: any } | null>(null);
  const handleMarkerClickRef = useRef(handleMarkerClick);
  handleMarkerClickRef.current = handleMarkerClick; // eslint-disable-line react-hooks/refs
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;

  useEffect(() => {
    if (!map || cameras.length === 0) { return; }

    const run = async () => {
      if (!deckModulesRef.current) {
        const [gm, layers] = await Promise.all([import('@deck.gl/google-maps'), import('@deck.gl/layers')]);
        deckModulesRef.current = { GoogleMapsOverlay: gm.GoogleMapsOverlay, ScatterplotLayer: layers.ScatterplotLayer };
      }
      // Always read latest cameras from ref after await
      const currentCameras = camerasRef.current;
      if (currentCameras.length === 0) { return; }

      const { GoogleMapsOverlay, ScatterplotLayer } = deckModulesRef.current;
      const rgb = [249, 115, 22]; // orange - visible on both themes, distinct from pink accent

      const layer = new ScatterplotLayer({
        id: 'cameras',
        data: currentCameras,
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius: 5,
        radiusUnits: 'pixels' as const,
        getFillColor: [...rgb, 220] as any,
        getLineColor: resolvedTheme === 'dark' ? [255, 255, 255, 120] : [255, 255, 255, 200] as any,
        lineWidthMinPixels: 1,
        stroked: true,
        pickable: true,
        onHover: (info: any) => {
          const wrapper = map.getDiv().closest('.map-wrapper');
          if (wrapper) { (wrapper as HTMLElement).classList.toggle('map-pointer', !!info.object); }
        },
        onClick: (info: any) => {
          if (info.object) {
            // Check if multiple cameras overlap at this pixel location
            const clickLat = info.object.lat;
            const clickLng = info.object.lng;
            const zoom = map.getZoom() || 10;
            // At high zoom, markers are well separated. At low zoom, check for neighbors.
            const threshold = 0.5 / Math.pow(2, zoom - 5); // ~pixel proximity in degrees
            const nearby = camerasRef.current.filter((c) =>
              Math.abs(c.lat - clickLat) < threshold && Math.abs(c.lng - clickLng) < threshold
            );
            if (nearby.length > 1 && zoom < 15) {
              // Multiple cameras at this location - zoom in to separate them
              map.panTo({ lat: clickLat, lng: clickLng });
              map.setZoom(Math.min(zoom + 3, 17));
            } else {
              handleMarkerClickRef.current(info.object.id);
            }
          }
        },
      });

      const layers: any[] = [layer];
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
        const overlay = new GoogleMapsOverlay({ layers });
        overlay.setMap(map);
        (overlay as any)._map = map;
        deckOverlayRef.current = overlay;
      } else {
        deckOverlayRef.current.setProps({ layers });
      }
    };
    run();
  }, [map, cameras, resolvedTheme, userLocation]);

  // Hide/show deck.gl layers during split resize to prevent flicker
  useEffect(() => {
    const hide = () => {
      if (deckOverlayRef.current) {
        deckOverlayRef.current.setProps({ layers: [] });
      }
    };
    const reshow = () => {
      if (deckOverlayRef.current && deckModulesRef.current) {
        const { ScatterplotLayer } = deckModulesRef.current;
        const rgb = [249, 115, 22]; // orange - match main layer
        const layer = new ScatterplotLayer({
          id: 'cameras',
          data: cameras,
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: 5,
          radiusUnits: 'pixels' as const,
          getFillColor: [...rgb, 220] as any,
          getLineColor: [255, 255, 255, 180] as any,
          lineWidthMinPixels: 1,
          stroked: true,
          pickable: true,
          onHover: (info: any) => {
            const wrapper = map?.getDiv().closest('.map-wrapper');
            if (wrapper) { (wrapper as HTMLElement).classList.toggle('map-pointer', !!info.object); }
          },
          onClick: (info: any) => {
            if (info.object) { handleMarkerClickRef.current(info.object.id); }
          },
        });
        const reshowLayers: any[] = [layer];
        if (userLocation) {
          reshowLayers.push(new ScatterplotLayer({
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
        deckOverlayRef.current.setProps({ layers: reshowLayers });
      }
    };
    window.addEventListener('deckHide', hide);
    window.addEventListener('deckReshow', reshow);
    return () => { window.removeEventListener('deckHide', hide); window.removeEventListener('deckReshow', reshow); };
  }, [map, cameras, userLocation]);

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
    }

    setDrawRect(null);
    startPointRef.current = null;
    if (selectMode) setSelectMode(false);
  }, [map, cameras, selectedIds, selectRoute, selectMode, visibleCameras]);

  // Shift key listener for power-user shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectMode) setSelectMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMode]);

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
      <button className="map-control-btn" onClick={() => { if (!map) return; const config = getStateConfig(stateId); map.panTo(config.defaultCenter); map.setZoom(config.defaultZoom); }} data-tooltip="Reset view" aria-label="Reset view">
        <Home size={18} />
      </button>
      <button className="map-control-btn" onClick={handleLocate} data-tooltip="Locate me" aria-label="Locate me">
        <Locate size={18} />
      </button>
      <button className={`map-control-btn ${selectMode ? 'map-control-btn-active' : ''}`} onClick={() => setSelectMode(!selectMode)} data-tooltip="Draw to select" aria-label="Draw to select">
        <BoxSelect size={18} />
      </button>
    </div>
    </div>
  );
}
