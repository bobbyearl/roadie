import './Header.css';

import { Link } from '@tanstack/react-router';
import {
  Columns,
  Grid2x2,
  Grid3x3,
  Image,
  LayoutGrid,
  MapIcon,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';

import { STATES } from '../lib/cameras';
import { useTheme } from '../lib/ThemeContext';
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
    view,
    cardSize,
    selectedCameras,
    stateConfig,
    setState,
    setMode,
    setGrid,
    setView,
    clearAll,
    triggerLayout,
  } = useTraffic();
  const { theme, setTheme } = useTheme();

  return (
    <header className="header-bar">
      <div className="header-row-1">
        <div className="header-bar-left">
          <h1 className="header-bar-title">
            <Link to="/">Roadie</Link>
          </h1>
          <select className="state-select" value={stateId} onChange={(e) => setState(e.target.value)}>
            <option value="all">All States</option>
            {STATES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="header-row-1-right">
          <div className="header-links">
            <a className="header-link" href="https://www.paypal.com/paypalme/bobbyearl" target="_blank" rel="noopener">
              Gas Money
            </a>
            <span className="header-divider">|</span>
            <a className="header-link" href="https://github.com/bobbyearl/roadie/issues/new?labels=bug" target="_blank" rel="noopener">
              Backseat Driver
            </a>
          </div>
          <select className="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as 'system' | 'light' | 'dark')}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      <div className="header-row-2">
        <span className="header-bar-count"><span className="hidden-mobile">Viewing </span>{selectedCameras.length}/{cameras.length}</span>
        <div className="header-bar-actions">
          <div className="btn-group">
            <button className={`btn-label ${view === 'split' ? 'btn-active' : ''}`} onClick={() => setView('split')}><Columns size={14} /> Split</button>
            <button className={`btn-label ${view === 'map' ? 'btn-active' : ''}`} onClick={() => setView('map')}><MapIcon size={14} /> Map</button>
            <button className={`btn-label ${view === 'list' ? 'btn-active' : ''}`} onClick={() => setView(undefined)}><LayoutGrid size={14} /> List</button>
          </div>
          {stateConfig.supportsVideo && (
            <div className="btn-group">
              <button className={`btn-label ${mode === 'video' ? 'btn-active' : ''}`} onClick={() => setMode(undefined)} disabled={selectedCameras.length === 0}><Video size={14} /> Video</button>
              <button className={`btn-label ${mode === 'image' ? 'btn-active' : ''}`} onClick={() => setMode('image')} disabled={selectedCameras.length === 0}><Image size={14} /> Image</button>
            </div>
          )}
          <div className="btn-group hidden-mobile">
            <button className={`btn-label ${cardSize === 'sm' ? 'btn-active' : ''}`} onClick={() => setGrid('sm')} disabled={selectedCameras.length === 0}><LayoutGrid size={14} /> Small</button>
            <button className={`btn-label ${cardSize === 'md' ? 'btn-active' : ''}`} onClick={() => setGrid(undefined)} disabled={selectedCameras.length === 0}><Grid3x3 size={14} /> Medium</button>
            <button className={`btn-label ${cardSize === 'lg' ? 'btn-active' : ''}`} onClick={() => setGrid('lg')} disabled={selectedCameras.length === 0}><Grid2x2 size={14} /> Large</button>
          </div>
          {view === 'map' && (
            <button className="btn-label" onClick={triggerLayout} disabled={selectedCameras.length < 2}><Sparkles size={14} /> Layout</button>
          )}
          <button className="btn-label" onClick={clearAll} disabled={selectedCameras.length === 0}><Trash2 size={14} /> Clear</button>
        </div>
        <button className="btn-label header-sidebar-toggle" onClick={onSidebarToggle} title="Toggle panel">
          {sidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} Browse
        </button>
      </div>
    </header>
  );
}
