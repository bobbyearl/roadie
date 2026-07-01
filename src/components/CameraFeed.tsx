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
  index?: number;
  refreshInterval?: number;
}

export function CameraFeed({ camera, onRemove, setDetailCam, index, refreshInterval = 0 }: CameraFeedProps) {
  const [onFullscreen, setOnFullscreen] = useState<(() => void) | undefined>();
  const fullscreenRef = useCallback((fn: (() => void) | undefined) => setOnFullscreen(() => fn), []);

  return (
    <div className="feed-item">
      <CameraCard camera={camera} onRemove={onRemove} onDetail={() => setDetailCam(camera)} onFullscreen={onFullscreen} index={index}>
        <CameraMedia camera={camera} refreshInterval={refreshInterval} onFullscreenRef={fullscreenRef} />
      </CameraCard>
    </div>
  );
}
