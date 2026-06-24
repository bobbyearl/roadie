/* eslint-disable react-hooks/refs */
import { arrow, autoUpdate, flip, FloatingArrow, FloatingPortal, offset, shift, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { Settings } from 'lucide-react';
import { useRef, useState } from 'react';

import { useTraffic } from '../lib/TrafficContext';

export function PrefsButton() {
  const { mode, showMap, showList, cardSize, density, stateConfig, setMode, setGrid, setDensity, setViewMode, resetAll } = useTraffic();
  const [open, setOpen] = useState(false);
  const [hasSeenPrefs, setHasSeenPrefs] = useState(() => localStorage.getItem('roadie-prefs-seen') === '1');
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen && !hasSeenPrefs) {
        localStorage.setItem('roadie-prefs-seen', '1');
        setHasSeenPrefs(true);
      }
    },
    placement: 'bottom',
    middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  const viewMode = showMap && showList ? 'both' : showMap ? 'map' : 'list';

  return (
    <>
      <button className={`btn-label ${open ? 'btn-active' : ''}`} ref={refs.setReference} {...getReferenceProps()} title="View Options">
        <Settings size={14} /> View Options
        {!hasSeenPrefs && <span className="prefs-dot" />}
      </button>
      {open && (
        <FloatingPortal>
          <div className="prefs-popover" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            <FloatingArrow ref={arrowRef} context={context} className="prefs-arrow" />
            <div className="prefs-row">
              <span className="prefs-label">View</span>
              <div className="prefs-options">
                <label><input type="radio" name="view" checked={viewMode === 'map'} onChange={() => setViewMode('map')} /> Map</label>
                <label><input type="radio" name="view" checked={viewMode === 'list'} onChange={() => setViewMode('list')} /> List</label>
                <label><input type="radio" name="view" checked={viewMode === 'both'} onChange={() => setViewMode('both')} /> Both</label>
              </div>
            </div>
            {stateConfig.supportsVideo && (
              <div className="prefs-row">
                <span className="prefs-label">Format (varies by state)</span>
                <div className="prefs-options">
                  <label><input type="radio" name="format" checked={mode === 'image'} onChange={() => setMode('image')} /> Images</label>
                  <label><input type="radio" name="format" checked={mode === 'video'} onChange={() => setMode(undefined)} /> Video</label>
                </div>
              </div>
            )}
            <div className="prefs-row">
              <span className="prefs-label">Size</span>
              <div className="prefs-options">
                <label><input type="radio" name="size" checked={cardSize === 'sm'} onChange={() => setGrid('sm')} /> Small</label>
                <label><input type="radio" name="size" checked={cardSize === 'md'} onChange={() => setGrid('md')} /> Medium</label>
                <label><input type="radio" name="size" checked={cardSize === 'lg'} onChange={() => setGrid(undefined)} /> Large</label>
              </div>
            </div>
            <div className="prefs-row">
              <span className="prefs-label">Density</span>
              <div className="prefs-options">
                <label><input type="radio" name="density" checked={density === 'compact'} onChange={() => setDensity('compact')} /> City Streets</label>
                <label><input type="radio" name="density" checked={density === 'open'} onChange={() => setDensity(undefined)} /> Open Road</label>
              </div>
            </div>
            <div className="prefs-footer">
              <button className="prefs-reset" onClick={() => { resetAll(); }}>Reset to Defaults</button>
              <button className="prefs-close" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
