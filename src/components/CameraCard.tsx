import './CameraCard.css';

import { Download, Info, X } from 'lucide-react';
import { type ReactNode } from 'react';

import { type Camera } from '../lib/cameras';

interface CameraCardProps {
  camera: Camera;
  onRemove: () => void;
  onDetail: () => void;
  children: ReactNode;
  headerLeft?: ReactNode;
  index?: number;
}

export function CameraCard({ camera, onRemove, onDetail, children, headerLeft, index }: CameraCardProps) {
  return (
    <>
      <div className="card-media">
        {index && <span className="card-index-badge">{index}</span>}
        {children}
      </div>
      <div className="card-footer">
        {headerLeft}
        <span className="card-title">{camera.description}</span>
        <button className="card-header-icon" onClick={onDetail} title="Details">
          <Info size={12} />
        </button>
        <a className="card-header-icon" href={camera.image_url} target="_blank" rel="noopener" title="Download">
          <Download size={12} />
        </a>
        <button className="card-header-icon" onClick={onRemove} title="Remove">
          <X size={12} />
        </button>
      </div>
    </>
  );
}
