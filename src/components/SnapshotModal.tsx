import './SnapshotModal.css';

import { Camera, Check, Clock, Copy, Download, X } from 'lucide-react';
import { useState } from 'react';

import { type Snapshot } from '../lib/useSnapshot';
import { uploadSnapshot } from '../lib/snapshotApi';
import { useTraffic } from '../lib/TrafficContext';

interface SnapshotModalProps {
  snapshot: Snapshot;
  onClose: () => void;
}

export function SnapshotModal({ snapshot, onClose }: SnapshotModalProps) {
  const { selectedCameras, stateId } = useTraffic();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleCopyLink = async () => {
    setUploading(true);
    const base = window.location.origin + import.meta.env.BASE_URL;
    const cameraIds = selectedCameras.map((c) => c.id).join(',');
    let url = `${base}view/${stateId}?selected=${cameraIds}`;

    // Try to upload snapshot for persistent sharing (non-blocking on failure)
    try {
      const result = await uploadSnapshot(snapshot.dataUrl);
      if (result) {
        url += `&snap=${result.id}&snapAt=${snapshot.capturedAt}`;
      }
    } catch {
      // Upload failed - share without snapshot (cameras-only link)
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard failed - fallback: select a hidden input
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setUploading(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = snapshot.dataUrl;
    link.download = `roadie-snapshot-${snapshot.cameraId}-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="snapshot-overlay" onClick={onClose}>
      <div className="snapshot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="snapshot-modal-header">
          <h2><Camera size={16} /> Snapshot</h2>
          <button className="snapshot-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="snapshot-preview">
          <img src={snapshot.dataUrl} alt="Captured snapshot" />
          <div className="snapshot-meta">
            <Clock size={12} />
            <span>{formatTimestamp(snapshot.capturedAt)}</span>
          </div>
        </div>

        <div className="snapshot-info">
          <p className="snapshot-camera-name">{snapshot.cameraName}</p>
          {selectedCameras.length > 1 && (
            <p className="snapshot-camera-count">{selectedCameras.length} cameras in view</p>
          )}
        </div>

        <div className="snapshot-actions">
          <button className="snapshot-btn snapshot-btn-primary" onClick={handleCopyLink} disabled={uploading}>
            {copied ? <><Check size={14} /> Copied!</> : uploading ? <>Uploading...</> : <><Copy size={14} /> Copy Share Link</>}
          </button>
          <button className="snapshot-btn snapshot-btn-secondary" onClick={handleDownload}>
            <Download size={14} /> Download
          </button>
        </div>

        <p className="snapshot-notice">
          Snapshots are shared via link and expire after 30 days.
        </p>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) +
    ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
