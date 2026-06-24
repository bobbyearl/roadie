import './Header.css';

import { Link } from '@tanstack/react-router';
import {
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { STATES } from '../lib/cameras';
import { useTraffic } from '../lib/TrafficContext';

interface HeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export function Header({ sidebarOpen, onSidebarToggle }: HeaderProps) {
  const {
    stateId,
    cameras,
    mode,
    showMap,
    showList,
    cardSize,
    density,
    selectedCameras,
    stateConfig,
    setState,
    setMode,
    setGrid,
    setDensity,
    toggleMap,
    toggleList,
    clearAll,
    resetAll,
    triggerLayout,
  } = useTraffic();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [hasSeenPrefs, setHasSeenPrefs] = useState(() => localStorage.getItem('roadie-prefs-seen') === '1');
  const prefsRef = useRef<HTMLDivElement>(null);

  const openPrefs = () => {
    setPrefsOpen(!prefsOpen);
    if (!hasSeenPrefs) {
      localStorage.setItem('roadie-prefs-seen', '1');
      setHasSeenPrefs(true);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'RoadieApp', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const viewMode = showMap && showList ? 'both' : showMap ? 'map' : 'list';
  const { setViewMode } = useTraffic();

  return (
    <header className="header-bar">
      <div className="header-nav">
        <h1 className="header-bar-title">
          <Link to="/">RoadieApp</Link>
        </h1>
        <select className="state-select" value={stateId} onChange={(e) => setState(e.target.value)}>
          <option value="all">All States</option>
          {STATES.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="header-nav-right">
          {showMap && !showList && (
            <button className="btn-label" onClick={triggerLayout} disabled={selectedCameras.length < 2}><Sparkles size={14} /> Layout</button>
          )}
          <button className="btn-label" onClick={handleShare} title="Share"><Share2 size={14} /> Share</button>
          <button className={`btn-label ${prefsOpen ? 'btn-active' : ''}`} onClick={openPrefs} title="View Options">
            <Settings size={14} /> View Options
            {!hasSeenPrefs && <span className="prefs-dot" />}
          </button>
          <button className={`btn-label ${sidebarOpen ? 'btn-active' : ''}`} onClick={onSidebarToggle}>
            {sidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} Browse
          </button>
        </div>
      </div>
      <div className="header-tab">
        <span className="header-tab-count">{selectedCameras.length}/{cameras.length}</span>
        <button className="header-tab-clear" onClick={clearAll} disabled={selectedCameras.length === 0}><Trash2 size={12} /></button>
      </div>

      {prefsOpen && (
        <>
          <div className="prefs-backdrop" onClick={() => setPrefsOpen(false)} />
          <div className="prefs-popover" ref={prefsRef}>
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
                <span className="prefs-label">Format</span>
                <div className="prefs-options">
                  <label><input type="radio" name="format" checked={mode === 'image'} onChange={() => setMode('image')} /> Images</label>
                  <label><input type="radio" name="format" checked={mode === 'video'} onChange={() => setMode(undefined)} /> Video (if available)</label>
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
                <label><input type="radio" name="density" checked={density === 'open'} onChange={() => setDensity(undefined)} /> Open Road</label>
                <label><input type="radio" name="density" checked={density === 'compact'} onChange={() => setDensity('compact')} /> City Streets</label>
              </div>
            </div>
            <div className="prefs-footer">
              <button className="prefs-reset" onClick={() => { resetAll(); setPrefsOpen(false); }}>Reset to Defaults</button>
              <button className="prefs-close" onClick={() => setPrefsOpen(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
