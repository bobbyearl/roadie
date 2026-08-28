import './Toolbar.css';

import { autoUpdate, offset, shift, useFloating, useDismiss, useHover, useInteractions } from '@floating-ui/react';
import { Bookmark, Car, Columns2, Grid2x2, Grid3x3, ImageIcon, LayoutGrid, MapIcon, List, Trash2 } from 'lucide-react';
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
    middleware: [offset(6), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { delay: { open: 0, close: 0 } });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss]);

  return (
    <>
      <button
        className={`toolbar-btn ${active ? 'toolbar-btn-active' : ''}`}
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={() => { setOpen(false); onClick(); }}
        disabled={disabled}
      >
        <Icon size={16} />
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
  const { showMap, showList, cardSize, toggleMap, toggleList, setViewMode, setGrid, mode, setMode, selectedCameras, clearAll, isLoading, autoPilot, activeRouteName } = useTraffic();
  const forceImages = mode === 'image';
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
            <ToolbarButton icon={Trash2} label="Clear selection (X)" active={false} disabled={selectedCameras.length === 0} onClick={clearAll} />
            <span className="toolbar-sep" />
            {activeRouteName && <span className="toolbar-route-name">{activeRouteName}</span>}
            <ToolbarButton icon={Bookmark} label={activeRouteName ? 'Manage bookmarks' : 'Save bookmark'} active={false} onClick={() => window.dispatchEvent(new Event('open-bookmarks-modal'))} />
          </>
        )}
      </div>
      <div className="toolbar-actions">
        <ToolbarButton icon={Car} label="Auto Pilot" active={autoPilot.active} onClick={handleAutoPilot} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={ImageIcon} label="Force images (I)" active={forceImages} onClick={() => setMode(forceImages ? undefined : 'image')} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={MapIcon} label="Toggle map view" active={showMap} disabled={showMap && !showList} onClick={() => { if (showMap && !showList) return; setViewMode(showMap ? 'list' : 'split'); }} />
        <ToolbarButton icon={List} label="Toggle list view" active={showList} disabled={showList && !showMap} onClick={() => { if (showList && !showMap) return; setViewMode(showList ? 'map' : 'split'); }} />
        <span className="toolbar-sep" />
        <ToolbarButton icon={cardSize === 'sm' ? LayoutGrid : cardSize === 'md' ? Grid3x3 : Grid2x2} label={`Grid: ${cardSize === 'sm' ? 'Small' : cardSize === 'md' ? 'Medium' : 'Large'}`} active={false} onClick={() => setGrid(cardSize === 'sm' ? 'md' : cardSize === 'md' ? 'lg' : 'sm')} />
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
