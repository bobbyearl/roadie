import './CameraCard.css';

import { autoUpdate, offset, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { Camera as CameraIcon, Download, Info, Maximize, MoreVertical, Video, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: menuOpen,
    onOpenChange: setMenuOpen,
    placement: 'bottom-end',
    middleware: [offset(4)],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      {index && <span className="card-index-badge">{index}</span>}
      <div className="card-header">
        {headerLeft}
        {camera.hasVideo ? <Video size={12} className="card-mode-icon" /> : <CameraIcon size={12} className="card-mode-icon" />}
        <span className="card-title">{camera.description}</span>
        <button className="card-header-icon" ref={refs.setReference} {...getReferenceProps()} title="More">
          <MoreVertical size={12} />
        </button>
        <button className="card-header-icon" onClick={onRemove} title="Remove">
          <X size={12} />
        </button>
      </div>
      {menuOpen && (
        <div className="card-menu" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
          <button className="card-menu-item" onClick={() => { onDetail(); setMenuOpen(false); }}>
            <Info size={12} /> Details
          </button>
          {camera.image_url && (
            <a className="card-menu-item" href={camera.image_url} target="_blank" rel="noopener" onClick={() => setMenuOpen(false)}>
              <Download size={12} /> Download Image
            </a>
          )}
          {onFullscreen && (
            <button className="card-menu-item" onClick={() => { onFullscreen(); setMenuOpen(false); }}>
              <Maximize size={12} /> Fullscreen
            </button>
          )}
        </div>
      )}
      <div className="card-media">
        {children}
      </div>
    </>
  );
}
