/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { track } from '../lib/analytics';
import { fetchMeta, getPins, resolveCameras } from '../lib/cameraData';
import { type Camera, getStateConfig, type StateConfig, STATES } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { type ViewSearchParams } from '../lib/types';
import { useAutoPilot } from '../lib/useAutoPilot';
import { usePrefs } from '../lib/usePrefs';
import { usePresets } from '../lib/usePresets';

interface TrafficState {
  // Data
  cameras: Camera[];
  isLoading: boolean;
  stateId: string;
  stateConfig: StateConfig;
  selectedIds: Set<string>;
  selectedCameras: Camera[];
  detailCam: Camera | null;
  activeRouteName: string | undefined;

  // Derived params
  mode: string;
  showMap: boolean;
  showList: boolean;
  cardSize: string;
  density: string;
  sidebarTab: string;
  splitWidth: number;
  splitHeight: number;
  sidebarOpen: boolean;
  mapPosition: { lat: number; lng: number; z: number } | null;

  // Actions
  toggleCamera: (id: string) => void;
  clearAll: () => void;
  resetAll: () => void;
  selectRoute: (ids: string[]) => void;
  setDetailCam: (cam: Camera | null) => void;
  setMode: (mode: string | undefined) => void;
  setGrid: (grid: string | undefined) => void;
  setDensity: (density: string | undefined) => void;
  toggleMap: () => void;
  toggleList: () => void;
  setViewMode: (mode: string) => void;
  setTab: (tab: string | undefined) => void;
  setSplitWidth: (percent: number) => void;
  setSplitHeight: (percent: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setMapPosition: (lat: number, lng: number, z: number) => void;
  setState: (state: string) => void;
  triggerLayout: () => void;
  layoutKey: number;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  findClosest: () => void;

  // Auto Pilot
  autoPilot: {
    active: boolean;
    heading: number | null;
    speed: number | null;
    needsDisclaimer: boolean;
    start: () => void;
    stop: () => void;
    acceptDisclaimer: () => void;
  };
}

const TrafficContext = createContext<TrafficState | null>(null);

export function useTraffic() {
  const ctx = useContext(TrafficContext);
  if (!ctx) {
    throw new Error('useTraffic must be used within TrafficProvider');
  }
  return ctx;
}

/** Create a comparable fingerprint from a set of IDs (order-independent) */
const setKey = (ids: string[]) => [...ids].sort().join(',');

export function TrafficProvider({ children }: { children: ReactNode }) {
  const { stateId } = useParams({ from: '/view/$stateId' });
  const params = useSearch({ from: '/view/$stateId' }) as ViewSearchParams;
  const navigate = useNavigate({ from: '/view/$stateId' });
  const prefs = usePrefs();
  const { presets: bookmarks } = usePresets();

  const stateConfig = getStateConfig(stateId);

  // Pins are inlined in HTML (window.__PINS__) - available instantly, no fetch
  const pins = useMemo(() => getPins(), []);

  // Metadata fetched eagerly on mount (background, non-blocking)
  const { data: meta } = useQuery({
    queryKey: ['camera-meta'],
    queryFn: fetchMeta,
    staleTime: Infinity,
  });

  // Resolve pins into full Camera objects (stubs until metadata arrives)
  const cameras = useMemo(() => resolveCameras(pins, meta), [pins, meta]);
  const isLoading = pins.length === 0;

  const { grid: cardSize, density, mode: prefsMode, sw: splitWidth, sh: splitHeight, showMap, showList } = prefs;
  // Use video if any state in view supports it, otherwise image
  const mode = stateConfig.supportsVideo ? prefsMode : 'image';
  const sidebarTab = params.tab ?? 'routes';
  const sidebarOpen = params.panel === '1';

  const selectedIdList = useMemo(() => params.selected?.split(',').filter(Boolean) ?? [], [params.selected]);
  const selectedIds = useMemo(() => new Set(selectedIdList), [selectedIdList]);
  const selectedCameras = useMemo(() => {
    const camMap = new Map(cameras.map((c) => [c.id, c]));
    return selectedIdList.map((id) => camMap.get(id)).filter(Boolean) as Camera[];
  }, [cameras, selectedIdList]);
  const detailCam = useMemo(
    () => (params.detail ? (cameras.find((c) => c.id === params.detail) ?? null) : null),
    [cameras, params.detail],
  );

  const activeRouteName = useMemo(() => {
    if (selectedIds.size === 0) {return undefined;}
    const key = setKey([...selectedIds]);
    // Check curated routes
    const curated = CURATED_ROUTES.find((r) => setKey(r.ids.map((id) => `sc:${id}`)) === key);
    if (curated) {return curated.name;}
    // Check bookmarks
    const match = bookmarks.find((p) => setKey(p.cameraIds) === key);
    if (match) {return match.name;}
    return undefined;
  }, [selectedIds, bookmarks]);

  const setSelected = (ids: Set<string>) =>
    navigate({ search: { ...params, selected: ids.size ? [...ids].join(',') : undefined } as ViewSearchParams });
  const toggleCamera = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };
  const clearAll = () => setSelected(new Set());
  const resetAll = () => { prefs.resetPrefs(); navigate({ search: { selected: params.selected } as ViewSearchParams }); };
  const selectRoute = (ids: string[]) => {
    setSelected(new Set(ids));
    const key = setKey(ids);
    const curated = CURATED_ROUTES.find((r) => setKey(r.ids.map((id) => `sc:${id}`)) === key);
    const bookmark = bookmarks.find((p) => setKey(p.cameraIds) === key);
    track('route_selected', {
      route_name: curated?.name ?? bookmark?.name ?? 'ad-hoc',
      camera_count: ids.length,
    });
  };
  const setDetailCam = (cam: Camera | null) =>
    navigate({ search: { ...params, detail: cam?.id || undefined } as ViewSearchParams });
  const toggleMap = () => prefs.setShowMap(!showMap);
  const toggleList = () => prefs.setShowList(!showList);
  const setViewMode = (m: string) => {
    prefs.setShowMap(m !== 'list');
    prefs.setShowList(m !== 'map');
    track('view_mode_changed', { view_mode: m as 'map' | 'list' | 'split' });
  };
  const setMode = (m: string | undefined) => prefs.setMode(m);
  const setGrid = (g: string | undefined) => prefs.setGrid(g);
  const setDensity = (d: string | undefined) => prefs.setDensity(d);
  const setTab = (tab: string | undefined) => navigate({ search: { ...params, tab } as ViewSearchParams });
  const setSplitWidth = (percent: number) => {
    const rounded = Math.round(percent);
    prefs.setSw(Math.min(85, Math.max(30, rounded)));
  };
  const setSplitHeight = (percent: number) => {
    const rounded = Math.round(percent);
    prefs.setSh(Math.min(80, Math.max(20, rounded)));
  };
  const setSidebarOpen = (open: boolean) => navigate({ search: { ...params, panel: open ? '1' : undefined } as ViewSearchParams });
  const mapPosition = params.lat && params.lng && params.z ? { lat: params.lat, lng: params.lng, z: params.z } : null;
  const setMapPosition = (lat: number, lng: number, z: number) => {
    navigate({ search: { ...params, lat: +lat.toFixed(5), lng: +lng.toFixed(5), z: Math.round(z) } as ViewSearchParams, replace: true });
  };
  const setState = (s: string) => {
    localStorage.setItem('roadie-last-state', s);
    setUserLocation(null);
    navigate({
      to: '/view/$stateId',
      params: { stateId: s },
      search: {} as ViewSearchParams,
    });
  };

  const [layoutKey, setLayoutKey] = useState(0);
  const triggerLayout = () => setLayoutKey((k) => k + 1);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const findClosest = () => {
    if (!navigator.geolocation || !cameras.length) { return; }
    track('find_closest');
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      let closest = cameras[0];
      let minDist = Infinity;
      for (const cam of cameras) {
        const d = (cam.lat - latitude) ** 2 + (cam.lng - longitude) ** 2;
        if (d < minDist) { minDist = d; closest = cam; }
      }
      if (!selectedIds.has(closest.id)) { toggleCamera(closest.id); }
    });
  };

  const autoPilot = useAutoPilot(
    cameras,
    (camerasAhead) => {
      // Auto-select cameras ahead, replacing current selection
      const ids = camerasAhead.map((c) => c.id);
      navigate({ search: { ...params, selected: ids.length ? ids.join(',') : undefined } as ViewSearchParams });
    },
    (loc) => {
      setUserLocation(loc);
    },
  );

  const value: TrafficState = {
    cameras,
    isLoading,
    stateId,
    stateConfig,
    selectedIds,
    selectedCameras,
    detailCam,
    activeRouteName,
    mode,
    showMap,
    showList,
    cardSize,
    density,
    sidebarTab,
    splitWidth,
    splitHeight,
    sidebarOpen,
    mapPosition,
    layoutKey,
    userLocation,
    setUserLocation,
    findClosest,
    autoPilot,
    toggleCamera,
    clearAll,
    resetAll,
    selectRoute,
    setDetailCam,
    toggleMap,
    toggleList,
    setViewMode,
    setMode,
    setGrid,
    setDensity,
    setTab,
    setSplitWidth,
    setSplitHeight,
    setSidebarOpen,
    setMapPosition,
    setState,
    triggerLayout,
  };

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
}
