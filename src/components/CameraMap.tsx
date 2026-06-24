import './CameraMap.css';

import { AdvancedMarker, APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  const { cameras, selectedIds, selectedCameras, toggleCamera, mode, cardSize, setDetailCam, layoutKey } = useTraffic();
  const { resolvedTheme } = useTheme();
  const map = useMap();
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

  const handleMarkerClick = (id: string) => {
    if (!didDragRef.current) {
      toggleCamera(id);
    }
  };

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

  // Map camera id -> 1-based selection index (matches order in split panel)
  const selectionIndex = new Map(selectedCameras.map((cam, i) => [cam.id, i + 1]));

  return (
    <GoogleMap
      defaultCenter={getStateConfig(stateId).defaultCenter}
      defaultZoom={getStateConfig(stateId).defaultZoom}
      mapId={mapId}
      colorScheme={resolvedTheme === 'dark' ? 'DARK' : 'LIGHT'}
      className="map-container"
      onCameraChanged={handleCameraChange}
      streetViewControl={false}
      fullscreenControl={!markersOnly}
      zoomControl={true}
      mapTypeControl={false}
      clickableIcons={false}
    >
      {visibleCameras.map((cam) => {
        const isSelected = selectedIds.has(cam.id);
        const offset = offsets.get(cam.id);
        return (
          <AdvancedMarker
            key={cam.id}
            position={{ lat: cam.lat, lng: cam.lng }}
            onClick={() => handleMarkerClick(cam.id)}
            zIndex={isSelected ? 100 + (selectionIndex.get(cam.id) ?? 0) : 1}
          >
            {isSelected && !markersOnly ? (
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
              isSelected ? (
                <div className="map-pin-selected">
                  {selectionIndex.get(cam.id) && <span className="map-pin-number">{selectionIndex.get(cam.id)}</span>}
                </div>
              ) : (
                <div className={`map-pin ${!getStateConfig(stateId).supportsVideo ? 'map-pin-image' : ''}`} />
              )
            )}
          </AdvancedMarker>
        );
      })}
    </GoogleMap>
  );
}
