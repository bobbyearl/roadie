/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { type Camera, getStateConfig, type StateConfig,STATES } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { type ViewSearchParams } from '../lib/types';
import { usePrefs } from '../lib/usePrefs';

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
  sidebarOpen: boolean;

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
  setSidebarOpen: (open: boolean) => void;
  setState: (state: string) => void;
  triggerLayout: () => void;
  layoutKey: number;
}

const TrafficContext = createContext<TrafficState | null>(null);

export function useTraffic() {
  const ctx = useContext(TrafficContext);
  if (!ctx) {
    throw new Error('useTraffic must be used within TrafficProvider');
  }
  return ctx;
}

export function TrafficProvider({ children }: { children: ReactNode }) {
  const params = useSearch({ from: '/view' }) as ViewSearchParams;
  const navigate = useNavigate({ from: '/view' });
  const prefs = usePrefs();

  const stateId = params.state ?? 'sc';
  const stateConfig = getStateConfig(stateId);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras', stateId],
    queryFn: async () => {
      if (stateId === 'all') {
        const results = await Promise.all(
          STATES.map(async (s) => {
            const res = await fetch(import.meta.env.BASE_URL + s.dataFile);
            const data = await res.json();
            return s.parser(data).map((cam) => ({ ...cam, id: `${s.id}:${cam.id}` }));
          }),
        );
        return results.flat();
      }
      const res = await fetch(import.meta.env.BASE_URL + stateConfig.dataFile);
      const data = await res.json();
      return stateConfig.parser(data);
    },
    staleTime: Infinity,
  });

  const { grid: cardSize, density, mode: prefsMode, sw: splitWidth } = prefs;
  const mode = stateConfig.supportsVideo ? prefsMode : 'image';
  const showMap = params.map !== '0';
  const showList = params.list !== '0';
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
    const joined = [...selectedIds].sort().join(',');
    return CURATED_ROUTES.find((r) => [...r.ids].sort().join(',') === joined)?.name;
  }, [selectedIds]);

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
  const resetAll = () => { prefs.resetPrefs(); navigate({ search: { state: params.state, selected: params.selected } as ViewSearchParams }); };
  const selectRoute = (ids: string[]) => setSelected(new Set(ids));
  const setDetailCam = (cam: Camera | null) =>
    navigate({ search: { ...params, detail: cam?.id || undefined } as ViewSearchParams });
  const toggleMap = () => navigate({ search: { ...params, map: params.map === '0' ? undefined : '0' } as ViewSearchParams });
  const toggleList = () => navigate({ search: { ...params, list: params.list === '0' ? undefined : '0' } as ViewSearchParams });
  const setViewMode = (m: string) => {
    const map = m === 'list' ? '0' : undefined;
    const list = m === 'map' ? '0' : undefined;
    navigate({ search: { ...params, map, list } as ViewSearchParams });
  };
  const setMode = (m: string | undefined) => prefs.setMode(m);
  const setGrid = (g: string | undefined) => prefs.setGrid(g);
  const setDensity = (d: string | undefined) => prefs.setDensity(d);
  const setTab = (tab: string | undefined) => navigate({ search: { ...params, tab } as ViewSearchParams });
  const setSplitWidth = (percent: number) => {
    const rounded = Math.round(percent);
    prefs.setSw(Math.min(85, Math.max(30, rounded)));
  };
  const setSidebarOpen = (open: boolean) => navigate({ search: { ...params, panel: open ? '1' : undefined } as ViewSearchParams });
  const setState = (s: string) =>
    navigate({
      search: {
        state: s === 'sc' ? undefined : s,
        map: params.map,
        list: params.list,
        tab: params.tab,
        selected: undefined,
        detail: undefined,
      } as ViewSearchParams,
    });

  const [layoutKey, setLayoutKey] = useState(0);
  const triggerLayout = () => setLayoutKey((k) => k + 1);

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
    sidebarOpen,
    layoutKey,
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
    setSidebarOpen,
    setState,
    triggerLayout,
  };

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
}
