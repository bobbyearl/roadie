import './SplitView.css';

import { useCallback, useRef } from 'react';

import { useTraffic } from '../lib/TrafficContext';
import { EmptyState } from '../routes/view.$stateId';
import { CameraFeed } from './CameraFeed';
import { CameraMap } from './CameraMap';

interface SplitViewProps {
  stateId: string;
  onBrowse: () => void;
}

export function SplitView({ stateId, onBrowse }: SplitViewProps) {
  const { selectedCameras, showList, mode, cardSize, splitWidth, setSplitWidth, toggleCamera, selectRoute, setDetailCam } = useTraffic();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const localPercent = useRef(splitWidth);
  const dragging = useRef(false);

  const startDrag = useCallback(() => {
    dragging.current = true;
    const isMobile = window.innerWidth < 768;
    document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    const getPos = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) { return { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }
      return { x: ev.clientX, y: ev.clientY };
    };

    const move = (ev: MouseEvent | TouchEvent) => {
      if ('touches' in ev) { ev.preventDefault(); }
      if (!containerRef.current) { return; }
      const rect = containerRef.current.getBoundingClientRect();
      const pos = getPos(ev);
      if (isMobile) {
        const percent = Math.min(80, Math.max(20, ((pos.y - rect.top) / rect.height) * 100));
        localPercent.current = percent;
        if (mapPanelRef.current) { mapPanelRef.current.style.height = `${percent}%`; }
      } else {
        const percent = Math.min(85, Math.max(30, ((pos.x - rect.left) / rect.width) * 100));
        localPercent.current = percent;
        if (mapPanelRef.current) { mapPanelRef.current.style.width = `${percent}%`; }
      }
    };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSplitWidth(localPercent.current);
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
      <div className="split-map-panel" style={{ width: showList ? `${splitWidth}%` : '100%', height: splitWidth !== 70 ? `${splitWidth}%` : undefined }} ref={mapPanelRef}>
        <CameraMap stateId={stateId} markersOnly={showList} />
      </div>
      {showList && (
        <>
          <div className="split-handle" onMouseDown={startDrag} onTouchStart={startDrag}>
            <div className="split-handle-grip" />
          </div>
          <div className="split-feeds-panel">
        {selectedCameras.length === 0 ? (
          <EmptyState stateId={stateId} selectRoute={selectRoute} onBrowse={onBrowse} showMap />
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
