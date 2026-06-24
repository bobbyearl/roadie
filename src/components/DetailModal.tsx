import './DetailModal.css';

import { X } from 'lucide-react';

import { useTraffic } from '../lib/TrafficContext';

export function DetailModal() {
  const { detailCam, setDetailCam } = useTraffic();
  if (!detailCam) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={() => setDetailCam(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{detailCam.description}</h2>
          <button className="btn-icon-sm" onClick={() => setDetailCam(null)}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <dl className="modal-details">
            <dt>Route</dt>
            <dd>{detailCam.route}</dd>
            <dt>Direction</dt>
            <dd>{detailCam.direction || 'N/A'}</dd>
            <dt>Region</dt>
            <dd>{detailCam.jurisdiction}</dd>
            <dt>Coordinates</dt>
            <dd>
              {detailCam.lat.toFixed(6)}, {detailCam.lng.toFixed(6)}
            </dd>
            <dt>Camera ID</dt>
            <dd>{detailCam.name}</dd>
            <dt>Image URL</dt>
            <dd>
              <a href={detailCam.image_url} target="_blank" rel="noopener">
                {detailCam.image_url}
              </a>
            </dd>
            <dt>Video URL</dt>
            <dd>
              <a href={detailCam.video_url} target="_blank" rel="noopener">
                {detailCam.video_url}
              </a>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
