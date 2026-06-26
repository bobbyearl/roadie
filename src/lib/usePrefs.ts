import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'roadie-prefs';

interface Prefs {
  grid?: string;
  density?: string;
  mode?: string;
  sw?: number;
  sh?: number;
  map?: boolean;
  list?: boolean;
}

const DEFAULTS: Required<Prefs> = { grid: 'lg', density: 'open', mode: 'video', sw: 70, sh: 50, map: true, list: true };

let cached: Prefs = readStorage();

function readStorage(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getSnapshot() { return cached; }

let listeners: Array<() => void> = [];
function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}
function notify() {
  cached = readStorage();
  listeners.forEach((l) => l());
}

function setPrefs(patch: Partial<Prefs>) {
  const next = { ...cached, ...patch };
  for (const [k, v] of Object.entries(next)) {
    if (v === DEFAULTS[k as keyof Prefs] || v === undefined) {
      delete next[k as keyof Prefs];
    }
  }
  if (Object.keys(next).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  notify();
}

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot);

  const grid = prefs.grid ?? DEFAULTS.grid;
  const density = prefs.density ?? DEFAULTS.density;
  const mode = prefs.mode ?? DEFAULTS.mode;
  const sw = prefs.sw ?? DEFAULTS.sw;
  const sh = prefs.sh ?? DEFAULTS.sh;
  const showMap = prefs.map ?? DEFAULTS.map;
  const showList = prefs.list ?? DEFAULTS.list;

  const setGrid = useCallback((v: string | undefined) => setPrefs({ grid: v ?? DEFAULTS.grid }), []);
  const setDensity = useCallback((v: string | undefined) => setPrefs({ density: v ?? DEFAULTS.density }), []);
  const setMode = useCallback((v: string | undefined) => setPrefs({ mode: v ?? DEFAULTS.mode }), []);
  const setSw = useCallback((v: number) => setPrefs({ sw: v }), []);
  const setSh = useCallback((v: number) => setPrefs({ sh: v }), []);
  const setShowMap = useCallback((v: boolean) => setPrefs({ map: v }), []);
  const setShowList = useCallback((v: boolean) => setPrefs({ list: v }), []);
  const resetPrefs = useCallback(() => { localStorage.removeItem(STORAGE_KEY); notify(); }, []);

  return { grid, density, mode, sw, sh, showMap, showList, setGrid, setDensity, setMode, setSw, setSh, setShowMap, setShowList, resetPrefs };
}
