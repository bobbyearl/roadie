import { useCallback, useEffect, useRef, useState } from 'react';
import { type Camera } from './cameras';

interface AutoPilotState {
  active: boolean;
  heading: number | null;
  speed: number | null;
  disclaimerShown: boolean;
}

/**
 * Calculate bearing from point A to point B in degrees (0-360)
 */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Haversine distance in km
 */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Angular difference between two bearings (0-180)
 */
function angleDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Find cameras ahead of the user within a forward cone
 */
export function findCamerasAhead(
  userLat: number,
  userLng: number,
  heading: number,
  cameras: Camera[],
  options: { coneAngle?: number; maxDistance?: number; maxResults?: number } = {},
): Camera[] {
  const { coneAngle = 45, maxDistance = 30, maxResults = 3 } = options;

  return cameras
    .map((cam) => {
      const dist = distanceKm(userLat, userLng, cam.lat, cam.lng);
      const bear = bearing(userLat, userLng, cam.lat, cam.lng);
      const angle = angleDiff(heading, bear);
      return { cam, dist, angle };
    })
    .filter(({ dist, angle }) => angle <= coneAngle && dist <= maxDistance && dist > 0.1) // exclude cameras behind us or too close
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxResults)
    .map(({ cam }) => cam);
}

export function useAutoPilot(
  cameras: Camera[],
  onCamerasAhead: (cameras: Camera[]) => void,
  onLocationUpdate: (loc: { lat: number; lng: number }) => void,
) {
  const [state, setState] = useState<AutoPilotState>({
    active: false,
    heading: null,
    speed: null,
    disclaimerShown: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastCameraIdsRef = useRef<string>('');

  const start = useCallback(() => {
    setState((s) => ({ ...s, active: true }));
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({ ...s, active: false, heading: null, speed: null }));
  }, []);

  const acceptDisclaimer = useCallback(() => {
    setState((s) => ({ ...s, disclaimerShown: true }));
    start();
  }, [start]);

  // Watch position when active
  useEffect(() => {
    if (!state.active || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        onLocationUpdate({ lat: latitude, lng: longitude });

        setState((s) => ({
          ...s,
          heading: heading ?? s.heading,
          speed: speed ?? s.speed,
        }));

        // If we have a heading, find cameras ahead
        const currentHeading = heading ?? state.heading;
        if (currentHeading !== null && cameras.length > 0) {
          const ahead = findCamerasAhead(latitude, longitude, currentHeading, cameras);
          const newIds = ahead.map((c) => c.id).join(',');
          // Only update if the camera set actually changed
          if (newIds !== lastCameraIdsRef.current) {
            lastCameraIdsRef.current = newIds;
            onCamerasAhead(ahead);
          }
        }
      },
      (err) => {
        console.warn('Auto Pilot geolocation error:', err.message);
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [state.active, cameras, onCamerasAhead, onLocationUpdate, state.heading, stop]);

  return {
    ...state,
    start,
    stop,
    acceptDisclaimer,
    toggle: () => (state.active ? stop() : state.disclaimerShown ? start() : null),
    needsDisclaimer: !state.disclaimerShown,
  };
}
