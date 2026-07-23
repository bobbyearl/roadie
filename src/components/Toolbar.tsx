import './Toolbar.css';

import { autoUpdate, offset, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { Bookmark, Car, Grid2x2, Grid3x3, ImageIcon, LayoutGrid, MapIcon, List, Locate, Trash2 } from 'lucide-react';
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
  const { showMap, showList, cardSize, toggleMap, toggleList, setGrid, setUserLocation, mode, setMode, selectedCameras, clearAll, isLoading, autoPilot, activeRouteName } = useTraffic();
  const forceImages = mode === 'image';
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  };

  const handleAutoPilot = () => {
    if (autoPilot.active) {
      autoPilot.stop();
    } else if (autoPilot.needsDisclaimer) {
      setShowDisclaimer(true);
    } else {
      autoPilot.start();
    }
  };

  return (
    <>
    <div className="toolbar">
      <div className="toolbar-selected">
        {isLoading ? (
          <span className="toolbar-loading">Loading cameras...</span>
        ) : autoPilot.active ? (
          <span className="toolbar-autopilot-badge">Auto Pilot {autoPilot.heading !== null ? `${Math.round(autoPilot.heading)}°` : ''}</span>
        ) : (
          <>
            <span className="toolbar-selected-count">{selectedCameras.length} selected</span>
            <button className="toolbar-selected-clear" onClick={clearAll} disabled={selectedCameras.length === 0}><Trash2 size={14} /></button>
            <span className="toolbar-sep" />
            {activeRouteName && <span className="toolbar-route-name">{activeRouteName}</span>}
            <button className="toolbar-selected-clear" onClick={() => window.dispatchEvent(new Event('open-bookmarks-modal'))} title={activeRouteName ? 'Manage Bookmarks' : 'Save Bookmark'}>
              <Bookmark size={14} />
            </button>
          </>
        )}
      </div>
      <div className="toolbar-actions">
        <ToolbarButton icon={Locate} label="Locate me" onClick={handleLocate} />
        <ToolbarButton icon={Car} label="Auto Pilot" active={autoPilot.active} onClick={handleAutoPilot} />
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

    {showDisclaimer && (
      <div className="autopilot-disclaimer-overlay" onClick={() => setShowDisclaimer(false)}>
        <div className="autopilot-disclaimer" onClick={(e) => e.stopPropagation()}>
          <h3>Auto Pilot Mode</h3>
          <p>This mode automatically shows cameras ahead based on your direction of travel.</p>
          <p><strong>Do not interact with this device while driving.</strong> Pull over to make changes or set up before departing.</p>
          <div className="autopilot-disclaimer-actions">
            <button className="autopilot-disclaimer-cancel" onClick={() => setShowDisclaimer(false)}>Cancel</button>
            <button className="autopilot-disclaimer-accept" onClick={() => { autoPilot.acceptDisclaimer(); setShowDisclaimer(false); }}>I Understand</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
