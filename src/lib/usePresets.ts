import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'roadie-presets';

export interface Preset {
  id: string;
  name: string;
  cameraIds: string[];
  createdAt: number;
}

let cached: Preset[] = readStorage();

function readStorage(): Preset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
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

function savePresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  notify();
}

export function usePresets() {
  const presets = useSyncExternalStore(subscribe, getSnapshot);

  const addPreset = useCallback((name: string, cameraIds: string[]) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const next = [...readStorage(), { id, name, cameraIds, createdAt: Date.now() }];
    savePresets(next);
    return id;
  }, []);

  const removePreset = useCallback((id: string) => {
    const next = readStorage().filter((p) => p.id !== id);
    savePresets(next);
  }, []);

  const renamePreset = useCallback((id: string, name: string) => {
    const next = readStorage().map((p) => (p.id === id ? { ...p, name } : p));
    savePresets(next);
  }, []);

  const updatePreset = useCallback((id: string, cameraIds: string[]) => {
    const next = readStorage().map((p) => (p.id === id ? { ...p, cameraIds } : p));
    savePresets(next);
  }, []);

  return { presets, addPreset, removePreset, renamePreset, updatePreset };
}
