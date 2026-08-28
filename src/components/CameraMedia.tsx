import { useEffect, useState } from 'react';

import { type Camera } from '../lib/cameras';
import { useTraffic } from '../lib/TrafficContext';
import { useVideoPlayer } from '../lib/useVideoPlayer';

interface CameraMediaProps {
  camera: Camera;
  refreshInterval?: number;
  onFullscreenRef?: (fn: (() => void) | undefined) => void;
  onMediaRef?: (el: HTMLVideoElement | HTMLImageElement | null) => void;
}

export function CameraMedia({ camera, refreshInterval = 0, onFullscreenRef, onMediaRef }: CameraMediaProps) {
  const { mode } = useTraffic();
  const effectiveMode = mode === 'image' ? 'image' : (camera.hasVideo ? 'video' : 'image');
  const { videoRef, videoKey, error, stalled, retryCount, retry, handleError, setError, attachHls } = useVideoPlayer(effectiveMode);
  const [imgTs, setImgTs] = useState(() => Date.now());

  // Attach HLS only when video element mounts or videoKey changes
  useEffect(() => {
    if (effectiveMode === 'video' && videoRef.current) {
      attachHls(videoRef.current, camera.video_url);
    }
  }, [videoKey, effectiveMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset error state when camera URL changes (e.g., metadata loads after stub)
  useEffect(() => {
    if (camera.image_url || camera.video_url) {
      setError(false);
    }
  }, [camera.image_url, camera.video_url, setError]);

  useEffect(() => {
    if (onFullscreenRef) {
      onFullscreenRef(effectiveMode === 'video' ? () => videoRef.current?.requestFullscreen() : undefined);
    }
  }, [effectiveMode, onFullscreenRef, videoRef]);

  useEffect(() => {
    if (effectiveMode !== 'image' || !refreshInterval) { return; }
    const id = setInterval(() => setImgTs(Date.now()), refreshInterval * 1000);
    return () => clearInterval(id);
  }, [effectiveMode, refreshInterval]);

  const imgSrc = !camera.image_url ? '' : refreshInterval ? `${camera.image_url}${camera.image_url.includes('?') ? '&' : '?'}t=${imgTs}` : camera.image_url;

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
            ref={(el) => { (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el; onMediaRef?.(el); }}
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
        <img src={imgSrc} alt={camera.description} onError={() => imgSrc && setError(true)} ref={(el) => onMediaRef?.(el)} />
      )}
    </div>
  );
}
