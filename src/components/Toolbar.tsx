import './Toolbar.css';

import { autoUpdate, offset, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { Grid2x2, Grid3x3, ImageIcon, LayoutGrid, MapIcon, List, Locate, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useTraffic } from '../lib/TrafficContext';

function ToolbarButton({ icon: Icon, label, active, onClick, disabled }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom',
    middleware: [offset(6)],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { delay: { open: 0, close: 0 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return (
    <>
      <button
        className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={onClick}
        disabled={disabled}
      >
        <Icon size={14} />
      </button>
      {open && (
        <div className="toolbar-tooltip" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
          {label}
        </div>
      )}
    </>
  );
}

export function Toolbar() {
  const { showMap, showList, cardSize, toggleMap, toggleList, setGrid, setUserLocation, mode, setMode, selectedCameras, clearAll, isLoading } = useTraffic();
  const forceImages = mode === 'image';

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  return (
    <div className="toolbar">
      <div className="toolbar-selected">
        {isLoading ? (
          <span className="toolbar-loading">Loading cameras...</span>
        ) : (
          <span className="toolbar-selected-count">{selectedCameras.length} selected</span>
        )}
        <button className="toolbar-selected-clear" onClick={clearAll} disabled={selectedCameras.length === 0 || isLoading}><Trash2 size={14} /></button>
      </div>
      <div className="toolbar-actions">
        <ToolbarButton icon={Locate} label="Locate me" onClick={handleLocate} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={MapIcon} label="Map" active={showMap} onClick={toggleMap} disabled={showMap && !showList} />
        <ToolbarButton icon={List} label="List" active={showList} onClick={toggleList} disabled={showList && !showMap} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={ImageIcon} label="Force images" active={forceImages} onClick={() => setMode(forceImages ? undefined : 'image')} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={LayoutGrid} label="Small" active={cardSize === 'sm'} onClick={() => setGrid('sm')} />
        <ToolbarButton icon={Grid3x3} label="Medium" active={cardSize === 'md'} onClick={() => setGrid('md')} />
        <ToolbarButton icon={Grid2x2} label="Large" active={cardSize === 'lg'} onClick={() => setGrid('lg')} />
      </div>
    </div>
  );
}
