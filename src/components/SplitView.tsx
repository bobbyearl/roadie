import './SplitView.css';

import { useMap } from '@vis.gl/react-google-maps';
import { autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { PanelRightClose } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useTraffic } from '../lib/TrafficContext';
import { EmptyState } from '../routes/view.$stateId';
import { CameraFeed } from './CameraFeed';
import { CameraMap } from './CameraMap';

/* eslint-disable react-hooks/refs */
function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'left',
    middleware: [offset({ mainAxis: 4 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { delay: { open: 0, close: 0 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return (
    <div className="view-close-wrapper">
      <button className="view-close-btn" ref={refs.setReference} {...getReferenceProps()} onClick={onClick}>
        <PanelRightClose size={14} />
      </button>
      {open && (
        <div className="view-close-tooltip" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
          {label}
        </div>
      )}
    </div>
  );
}

interface SplitViewProps {
  stateId: string;
  onBrowse: () => void;
  onCloseMap?: () => void;
  onCloseList?: () => void;
}

export function SplitView({ stateId, onBrowse, onCloseMap, onCloseList }: SplitViewProps) {
  const { cameras, selectedCameras, showList, mode, cardSize, splitWidth, setSplitWidth, toggleCamera, selectRoute, setDetailCam } = useTraffic();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const localPercent = useRef(splitWidth);
  const dragging = useRef(false);
  const rafRef = useRef<number>(0);
  const map = useMap();
  const [ghostPercent, setGhostPercent] = useState<number | null>(null);

  const startDrag = useCallback(() => {
    dragging.current = true;
    (window as any).__deckResizing = true;
    window.dispatchEvent(new Event('deckHide'));
    const isMobile = window.innerWidth < 768;
    document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    const getPos = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) { return { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }
      return { x: ev.clientX, y: ev.clientY };
    };

    const move = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) { ev.preventDefault(); }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) { return; }
        const rect = containerRef.current.getBoundingClientRect();
        const pos = getPos(ev);
        if (isMobile) {
          localPercent.current = Math.min(80, Math.max(20, ((pos.y - rect.top) / rect.height) * 100));
        } else {
          localPercent.current = Math.min(85, Math.max(30, ((pos.x - rect.left) / rect.width) * 100));
        }
        setGhostPercent(localPercent.current);
      });
    };
    const up = () => {
      dragging.current = false;
      (window as any).__deckResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Apply final size in one shot
      const isMob = window.innerWidth < 768;
      if (mapPanelRef.current) {
        if (isMob) { mapPanelRef.current.style.height = `${localPercent.current}%`; }
        else { mapPanelRef.current.style.width = `${localPercent.current}%`; }
      }
      setSplitWidth(localPercent.current);
      setGhostPercent(null);
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('deckReshow'));
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }, [setSplitWidth]);

  const gridClass = cardSize === 'lg' ? 'split-feeds-lg' : cardSize === 'sm' ? 'split-feeds-sm' : 'split-feeds-md';

  return (
    <div className="split-container" ref={containerRef}>
      {ghostPercent !== null && (
        <div className="split-ghost" style={{ left: `${ghostPercent}%` }} />
      )}
      <div className="split-map-panel" style={{ width: showList ? `${splitWidth}%` : '100%' }} ref={mapPanelRef}>
        {onCloseMap && <CloseButton onClick={onCloseMap} label="Hide Map - Restore in View Options" />}
        <CameraMap stateId={stateId} markersOnly={showList} />
      </div>
      {showList && (
        <>
          <div className="split-handle" onMouseDown={startDrag} onTouchStart={startDrag}>
            <div className="split-handle-grip" />
          </div>
          <div className="split-feeds-panel">
            {onCloseList && <CloseButton onClick={onCloseList} label="Hide List - Restore in View Options" />}
        {selectedCameras.length === 0 ? (
          <EmptyState stateId={stateId} cameras={cameras} selectRoute={selectRoute} toggleCamera={toggleCamera} onBrowse={onBrowse} showMap />
        ) : (
            <div className={`split-feeds-grid ${gridClass}`}>
              {selectedCameras.map((cam, index) => (
                <CameraFeed key={cam.id} camera={cam} mode={mode} onRemove={() => toggleCamera(cam.id)} setDetailCam={setDetailCam} index={index + 1} refreshInterval={mode === 'image' ? 30 : 0} />
              ))}
            </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}
