import './CameraFeed.css';

import { useCallback, useState } from 'react';

import { type Camera } from '../lib/cameras';
import { CameraCard } from './CameraCard';
import { CameraMedia } from './CameraMedia';

interface CameraFeedProps {
  camera: Camera;
  mode: string;
  onRemove: () => void;
  setDetailCam: (c: Camera) => void;
  onSnapshot?: (cameraId: string, cameraName: string) => void;
  onMediaRef?: (cameraId: string, el: HTMLVideoElement | HTMLImageElement | null) => void;
  index?: number;
  refreshInterval?: number;
}

export function CameraFeed({ camera, onRemove, setDetailCam, onSnapshot, onMediaRef, index, refreshInterval = 0 }: CameraFeedProps) {
  const [onFullscreen, setOnFullscreen] = useState<(() => void) | undefined>();
  const fullscreenRef = useCallback((fn: (() => void) | undefined) => setOnFullscreen(() => fn), []);

  return (
    <div className="feed-item">
      <CameraCard
        camera={camera}
        onRemove={onRemove}
        onDetail={() => setDetailCam(camera)}
        onFullscreen={onFullscreen}
        onSnapshot={onSnapshot ? () => onSnapshot(camera.id, camera.description) : undefined}
        index={index}
      >
        <CameraMedia
          camera={camera}
          refreshInterval={refreshInterval}
          onFullscreenRef={fullscreenRef}
          onMediaRef={onMediaRef ? (el) => onMediaRef(camera.id, el) : undefined}
        />
      </CameraCard>
    </div>
  );
}
