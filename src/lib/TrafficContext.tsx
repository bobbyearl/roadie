/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { type Camera, getStateConfig, type StateConfig,STATES } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { type ViewSearchParams } from '../lib/types';

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
  view: string;
  cardSize: string;
  sidebarTab: string;
  splitWidth: number;
  sidebarOpen: boolean;

  // Actions
  toggleCamera: (id: string) => void;
  clearAll: () => void;
  selectRoute: (ids: string[]) => void;
  setDetailCam: (cam: Camera | null) => void;
  setView: (view: string | undefined) => void;
  setMode: (mode: string | undefined) => void;
  setGrid: (grid: string | undefined) => void;
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

  const mode = stateConfig.supportsVideo ? (params.mode ?? 'video') : 'image';
  const view = params.view ?? 'feeds';
  const cardSize = params.grid ?? 'md';
  const sidebarTab = params.tab ?? 'routes';
  const splitWidth = params.sw ? Math.min(85, Math.max(30, Number(params.sw))) : 70;
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
  const selectRoute = (ids: string[]) => setSelected(new Set(ids));
  const setDetailCam = (cam: Camera | null) =>
    navigate({ search: { ...params, detail: cam?.id || undefined } as ViewSearchParams });
  const setView = (v: string | undefined) => navigate({ search: { ...params, view: v } as ViewSearchParams });
  const setMode = (m: string | undefined) => navigate({ search: { ...params, mode: m } as ViewSearchParams });
  const setGrid = (g: string | undefined) => navigate({ search: { ...params, grid: g } as ViewSearchParams });
  const setTab = (tab: string | undefined) => navigate({ search: { ...params, tab } as ViewSearchParams });
  const setSplitWidth = (percent: number) => {
    const rounded = Math.round(percent);
    navigate({ search: { ...params, sw: rounded === 70 ? undefined : String(rounded) } as ViewSearchParams });
  };
  const setSidebarOpen = (open: boolean) => navigate({ search: { ...params, panel: open ? '1' : undefined } as ViewSearchParams });
  const setState = (s: string) =>
    navigate({
      search: {
        state: s === 'sc' ? undefined : s,
        view: params.view,
        mode: params.mode,
        grid: params.grid,
        tab: params.tab,
        sw: params.sw,
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
    view,
    cardSize,
    sidebarTab,
    splitWidth,
    sidebarOpen,
    layoutKey,
    toggleCamera,
    clearAll,
    selectRoute,
    setDetailCam,
    setView,
    setMode,
    setGrid,
    setTab,
    setSplitWidth,
    setSidebarOpen,
    setState,
    triggerLayout,
  };

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
}
