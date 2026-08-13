import './SnapshotBanner.css';

import { Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { getSnapshotUrl, isValidSnapshotUrl } from '../lib/snapshotApi';
import { useTraffic } from '../lib/TrafficContext';
import { CameraMedia } from './CameraMedia';
import { type ViewSearchParams } from '../lib/types';

export function SnapshotBanner() {
  const { snap, snapAt } = useSearch({ from: '/view/$stateId' }) as ViewSearchParams;
  const navigate = useNavigate({ from: '/view/$stateId' });
  const { selectedCameras } = useTraffic();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The first selected camera is the one the snapshot was taken from
  const snapshotCamera = selectedCameras[0] ?? null;

  const handleDismiss = () => {
    setDismissed(true);
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, snap: undefined, snapAt: undefined }) as ViewSearchParams });
  };

  useEffect(() => {
    if (!snap || dismissed) return;

    if (!/^[a-z0-9]{8}$/.test(snap)) {
      setError('Invalid snapshot');
      return;
    }

    const url = getSnapshotUrl(snap);
    if (!url) {
      setError('Snapshot unavailable');
      return;
    }

    if (!isValidSnapshotUrl(url)) {
      setError('Invalid snapshot source');
      return;
    }

    fetch(url, { method: 'HEAD' }).then((res) => {
      if (res.ok) {
        setImageUrl(url);
      } else if (res.status === 410) {
        setError('Snapshot expired');
      } else {
        setError('Snapshot not found');
      }
    }).catch(() => setError('Snapshot unavailable'));
  }, [snap, dismissed]);

  if (!snap || dismissed) return null;
  if (!imageUrl && !error) return null;

  const timeLabel = snapAt ? formatTimeAgo(snapAt) : 'Unknown time';

  return (
    <div className="snap-compare-overlay" onClick={handleDismiss}>
      <div className="snap-compare-modal" onClick={(e) => e.stopPropagation()}>
        <div className="snap-compare-header">
          <h2>Snapshot Comparison</h2>
          <button className="snap-compare-close" onClick={handleDismiss}><X size={16} /></button>
        </div>

        {error ? (
          <div className="snap-compare-error">
            <p>{error}</p>
            <p className="snap-compare-error-sub">The snapshot may have expired or been removed.</p>
          </div>
        ) : (
          <>
            {/* Sponsor slot */}
            <div className="snap-compare-sponsor">
              <span className="snap-compare-sponsor-label">Sponsored by</span>
              <span className="snap-compare-sponsor-name">Your Ad Here</span>
            </div>

            <div className="snap-compare-body">
              <div className="snap-compare-side">
                <div className="snap-compare-label">
                  <Clock size={12} />
                  <span>{timeLabel}</span>
                </div>
                <div className="snap-compare-image">
                  <img src={imageUrl!} alt="Snapshot" />
                </div>
              </div>
              <div className="snap-compare-side">
                <div className="snap-compare-label snap-compare-label-live">
                  <span className="snap-compare-live-dot" />
                  <span>Live</span>
                </div>
                <div className="snap-compare-image">
                  {snapshotCamera ? (
                    <CameraMedia camera={snapshotCamera} refreshInterval={30} />
                  ) : (
                    <div className="snap-compare-no-feed">Live feed loading...</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="snap-compare-footer">
          <span className="snap-compare-camera-name">{snapshotCamera?.description ?? 'Camera'}</span>
          <button className="snap-compare-dismiss" onClick={handleDismiss}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
