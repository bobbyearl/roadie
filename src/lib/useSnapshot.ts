import { useCallback, useRef, useState } from 'react';

export interface Snapshot {
  dataUrl: string;
  cameraId: string;
  cameraName: string;
  capturedAt: number;
  width: number;
  height: number;
}

export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const mediaRefs = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());

  const registerMedia = useCallback((cameraId: string, el: HTMLVideoElement | HTMLImageElement | null) => {
    if (el) {
      mediaRefs.current.set(cameraId, el);
    } else {
      mediaRefs.current.delete(cameraId);
    }
  }, []);

  const capture = useCallback((cameraId: string, cameraName: string) => {
    const el = mediaRefs.current.get(cameraId);
    if (!el) return;

    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      const isVideo = el instanceof HTMLVideoElement;
      const w = isVideo ? el.videoWidth : el.naturalWidth || el.width;
      const h = isVideo ? el.videoHeight : el.naturalHeight || el.height;

      if (!w || !h) {
        setCapturing(false);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setCapturing(false); return; }

      ctx.drawImage(el, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setSnapshot({
        dataUrl,
        cameraId,
        cameraName,
        capturedAt: Date.now(),
        width: w,
        height: h,
      });
    } catch {
      // Cross-origin or tainted canvas - camera doesn't support capture
      setSnapshot(null);
    }
    setCapturing(false);
  }, []);

  const clearSnapshot = useCallback(() => setSnapshot(null), []);

  return { snapshot, capturing, capture, clearSnapshot, registerMedia };
}
