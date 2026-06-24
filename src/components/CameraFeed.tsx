import './CameraFeed.css';

import { type Camera } from '../lib/cameras';
import { useVideoPlayer } from '../lib/useVideoPlayer';
import { CameraCard } from './CameraCard';

interface CameraFeedProps {
  camera: Camera;
  mode: string;
  onRemove: () => void;
  setDetailCam: (c: Camera) => void;
  index?: number;
}

export function CameraFeed({ camera, mode, onRemove, setDetailCam, index }: CameraFeedProps) {
  const { videoRef, videoKey, error, stalled, retryCount, retry, handleError, setError } = useVideoPlayer(mode);

  return (
    <div className="feed-item">
      <CameraCard camera={camera} onRemove={onRemove} onDetail={() => setDetailCam(camera)} index={index}>
        <div className="feed-media">
          {error ? (
            <div className="feed-error">
              <p className="feed-error-text">Feed unavailable</p>
              <button className="feed-error-retry" onClick={retry}>Retry</button>
            </div>
          ) : mode === 'video' ? (
            <>
              <video
                key={videoKey}
                ref={videoRef}
                src={camera.video_url}
                autoPlay
                muted
                playsInline
                controls
                onError={handleError}
              />
              {stalled && (
                <div className="feed-stalled-overlay">
                  <span className="feed-stalled">unstable feed{retryCount > 0 ? ` (retry ${retryCount}/3)` : ''}</span>
                </div>
              )}
            </>
          ) : (
            <img src={camera.image_url} alt={camera.description} onError={() => setError(true)} />
          )}
        </div>
      </CameraCard>
    </div>
  );
}
