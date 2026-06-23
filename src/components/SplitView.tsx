import './SplitView.css';

import { useCallback, useRef } from 'react';

import { useTraffic } from '../lib/TrafficContext';
import { CameraFeed } from './CameraFeed';
import { CameraMap } from './CameraMap';
import { EmptyState } from '../routes/view';

interface SplitViewProps {
  stateId: string;
  onBrowse: () => void;
}

export function SplitView({ stateId, onBrowse }: SplitViewProps) {
  const { cameras, selectedCameras, mode, cardSize, splitWidth, setSplitWidth, toggleCamera, selectRoute, setDetailCam } = useTraffic();
  const containerRef = useRef<HTMLDivElement>(null);
  const localPercent = useRef(splitWidth);
  const dragging = useRef(false);

  const startDrag = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (e: MouseEvent) => {
      if (!containerRef.current) { return; }
      const rect = containerRef.current.getBoundingClientRect();
      const percent = Math.min(85, Math.max(30, ((e.clientX - rect.left) / rect.width) * 100));
      localPercent.current = percent;
      // Update the DOM directly for smooth dragging (no re-renders during drag)
      const mapPanel = containerRef.current.firstElementChild as HTMLElement;
      if (mapPanel) { mapPanel.style.width = `${percent}%`; }
    };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSplitWidth(localPercent.current);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [setSplitWidth]);

  const gridClass = cardSize === 'lg' ? 'split-feeds-lg' : cardSize === 'sm' ? 'split-feeds-sm' : 'split-feeds-md';

  return (
    <div className="split-container" ref={containerRef}>
      <div className="split-map-panel" style={{ width: `${splitWidth}%` }}>
        <CameraMap stateId={stateId} markersOnly />
      </div>
      <div className="split-handle" onMouseDown={startDrag} />
      <div className="split-feeds-panel">
        {selectedCameras.length === 0 ? (
          <EmptyState stateId={stateId} selectRoute={selectRoute} onBrowse={onBrowse} onSwitchToMap={() => {}} />
        ) : (
            <div className={`split-feeds-grid ${gridClass}`}>
              {selectedCameras.map((cam, index) => (
                <CameraFeed key={cam.id} camera={cam} mode={mode} onRemove={() => toggleCamera(cam.id)} setDetailCam={setDetailCam} index={index + 1} />
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
