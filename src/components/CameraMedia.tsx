import { useEffect, useState } from 'react';

import { type Camera } from '../lib/cameras';
import { useVideoPlayer } from '../lib/useVideoPlayer';

interface CameraMediaProps {
  camera: Camera;
  mode: string;
  refreshInterval?: number;
  onFullscreenRef?: (fn: (() => void) | undefined) => void;
}

export function CameraMedia({ camera, mode, refreshInterval = 0, onFullscreenRef }: CameraMediaProps) {
  const effectiveMode = mode === 'image' && !camera.image_url && camera.video_url ? 'video' : mode;
  const { videoRef, videoKey, error, stalled, retryCount, retry, handleError, setError, attachHls } = useVideoPlayer(effectiveMode);
  const [imgTs, setImgTs] = useState(() => Date.now());

  useEffect(() => {
    if (onFullscreenRef) {
      onFullscreenRef(effectiveMode === 'video' ? () => videoRef.current?.requestFullscreen() : undefined);
    }
  }, [effectiveMode, onFullscreenRef, videoRef]);

  useEffect(() => {
    if (mode !== 'image' || !refreshInterval) { return; }
    const id = setInterval(() => setImgTs(Date.now()), refreshInterval * 1000);
    return () => clearInterval(id);
  }, [mode, refreshInterval]);

  const imgSrc = refreshInterval ? `${camera.image_url}${camera.image_url.includes('?') ? '&' : '?'}t=${imgTs}` : camera.image_url;

  return (
    <div className="feed-media">
      {error ? (
        <div className="feed-error">
          <p className="feed-error-text">Feed unavailable</p>
          <button className="feed-error-retry" onClick={retry}>Retry</button>
        </div>
      ) : effectiveMode === 'video' ? (
        <>
          <video
            key={videoKey}
            ref={(el) => {
              (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
              if (el) { attachHls(el, camera.video_url); }
            }}
            autoPlay
            muted
            playsInline
            onError={handleError}
          />
          {stalled && (
            <div className="feed-stalled-overlay">
              <span className="feed-stalled">unstable feed{retryCount > 0 ? ` (retry ${retryCount}/3)` : ''}</span>
            </div>
          )}
        </>
      ) : (
        <img src={imgSrc} alt={camera.description} onError={() => setError(true)} />
      )}
    </div>
  );
}
