import './CameraCard.css';

import { Download, Info, Maximize, X } from 'lucide-react';
import { type ReactNode } from 'react';

import { type Camera } from '../lib/cameras';

interface CameraCardProps {
  camera: Camera;
  onRemove: () => void;
  onDetail: () => void;
  onFullscreen?: () => void;
  children: ReactNode;
  headerLeft?: ReactNode;
  index?: number;
}

export function CameraCard({ camera, onRemove, onDetail, onFullscreen, children, headerLeft, index }: CameraCardProps) {
  return (
    <>
      {index && <span className="card-index-badge">{index}</span>}
      <div className="card-header">
        {headerLeft}
        <span className="card-title">{camera.description}</span>
        <button className="card-header-icon" onClick={onDetail} title="Details">
          <Info size={12} />
        </button>
        <a className="card-header-icon" href={camera.image_url} target="_blank" rel="noopener" title="Download">
          <Download size={12} />
        </a>
        {onFullscreen && (
          <button className="card-header-icon" onClick={onFullscreen} title="Fullscreen">
            <Maximize size={12} />
          </button>
        )}
        <button className="card-header-icon" onClick={onRemove} title="Remove">
          <X size={12} />
        </button>
      </div>
      <div className="card-media">
        {children}
      </div>
    </>
  );
}
