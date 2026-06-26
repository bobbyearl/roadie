import './CameraMap.css';

import { AdvancedMarker, APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type Camera, getStateConfig } from '../lib/cameras';
import { useTheme } from '../lib/ThemeContext';
import { useTraffic } from '../lib/TrafficContext';
import { CameraCard } from './CameraCard';

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
  const { cameras, selectedIds, selectedCameras, toggleCamera, mode, cardSize, setDetailCam, layoutKey, userLocation } = useTraffic();
  const { resolvedTheme } = useTheme();
  const map = useMap();
  const prevStateRef = useRef(stateId);
  useEffect(() => {
    if (map && stateId !== prevStateRef.current) {
      const config = getStateConfig(stateId);
      map.setCenter(config.defaultCenter);
      map.setZoom(config.defaultZoom);
      prevStateRef.current = stateId;
    }
  }, [map, stateId]);

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
    if (!isManualLayout) {
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
  }, [selectedIds, map, cameras, cardWidthPx, layoutKey]);

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

  useEffect(() => {
    if (!map || cameras.length === 0) { return; }

    const run = async () => {
      if (!deckModulesRef.current) {
        const [gm, layers] = await Promise.all([import('@deck.gl/google-maps'), import('@deck.gl/layers')]);
        deckModulesRef.current = { GoogleMapsOverlay: gm.GoogleMapsOverlay, ScatterplotLayer: layers.ScatterplotLayer };
      }
      const { GoogleMapsOverlay, ScatterplotLayer } = deckModulesRef.current;
      const rgb = [249, 115, 22]; // orange - visible on both themes, distinct from pink accent

      const layer = new ScatterplotLayer({
        id: 'cameras',
        data: cameras,
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
          if (info.object) { handleMarkerClickRef.current(info.object.id); }
        },
      });

      if (!deckOverlayRef.current || deckOverlayRef.current._map !== map) {
        if (deckOverlayRef.current) { deckOverlayRef.current.setMap(null); }
        const overlay = new GoogleMapsOverlay({ layers: [layer] });
        overlay.setMap(map);
        (overlay as any)._map = map;
        deckOverlayRef.current = overlay;
      } else {
        deckOverlayRef.current.setProps({ layers: [layer] });
      }
    };
    run();
  }, [map, cameras, resolvedTheme]);

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
        const rgb = [220, 50, 160];
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
        deckOverlayRef.current.setProps({ layers: [layer] });
      }
    };
    window.addEventListener('deckHide', hide);
    window.addEventListener('deckReshow', reshow);
    return () => { window.removeEventListener('deckHide', hide); window.removeEventListener('deckReshow', reshow); };
  }, [map, cameras]);

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
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(12);
      },
      () => { /* silently fail if denied */ }
    );
  };

  // Pan to show user location + closest camera when findClosest triggers
  useEffect(() => {
    if (!map || !userLocation) { return; }
    if (selectedCameras.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userLocation);
      selectedCameras.slice(-1).forEach((cam) => bounds.extend({ lat: cam.lat, lng: cam.lng }));
      map.fitBounds(bounds, 60);
    } else {
      map.panTo(userLocation);
      map.setZoom(12);
    }
  }, [map, userLocation, selectedCameras]);

  return (
    <div className="map-wrapper">
      <button className="map-locate-btn" onClick={handleLocate} title="Find my location">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
      </button>
      <GoogleMap
      defaultCenter={getStateConfig(stateId).defaultCenter}
      defaultZoom={getStateConfig(stateId).defaultZoom}
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
                    {mode === 'video' ? (
                      <video src={cam.video_url} autoPlay muted playsInline controls />
                    ) : (
                      <img src={cam.image_url} alt={cam.description} />
                    )}
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
      {userLocation && (
        <AdvancedMarker position={userLocation} zIndex={200}>
          <div className="map-user-pin" />
        </AdvancedMarker>
      )}
    </GoogleMap>
    </div>
  );
}
