import './CameraCard.css';

import { Download, Info, Share2, X } from 'lucide-react';
import { type ReactNode } from 'react';

import { type Camera } from '../lib/cameras';

interface CameraCardProps {
  camera: Camera;
  onRemove: () => void;
  onDetail: () => void;
  children: ReactNode; // media slot (video/image/error state)
  headerLeft?: ReactNode; // optional slot before info icon (drag handle)
}

export function CameraCard({ camera, onRemove, onDetail, children, headerLeft }: CameraCardProps) {
  const handleShare = () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}view?selected=${camera.id}&detail=${camera.id}`;
    if (navigator.share) {
      navigator.share({ title: camera.description, text: `${camera.description} - Roadie`, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = camera.image_url;
    link.download = `${camera.description.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <>
      <div className="card-header">
        {headerLeft}
        <span className="card-title">{camera.description}</span>
        <button className="card-header-icon" onClick={onRemove} title="Remove"><X size={12} /></button>
      </div>
      {children}
      <div className="card-footer">
        <button className="card-footer-icon" onClick={onDetail} title="Details"><Info size={14} /></button>
        <button className="card-footer-icon" onClick={handleShare} title="Share"><Share2 size={14} /></button>
        <button className="card-footer-icon" onClick={handleDownload} title="Download"><Download size={14} /></button>
      </div>
    </>
  );
}
