import { STATES } from '../lib/cameras'
import { useTraffic } from '../lib/TrafficContext'
import { Image, Video, Grid2x2, Grid3x3, LayoutGrid, MapIcon, Trash2, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react'
import './TopBar.css'

interface TopBarProps {
  sidebarOpen: boolean
  onSidebarToggle: () => void
}

export function TopBar({ sidebarOpen, onSidebarToggle }: TopBarProps) {
  const { stateId, mode, view, cardSize, selectedCameras, stateConfig, setState, setMode, setGrid, setView, clearAll, triggerLayout } = useTraffic()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Bobby Earl Traffic</h1>
        <span className="topbar-subtitle">7,607 cameras across 4 states</span>
      </div>
      <div className="topbar-center">
        <select className="state-select" value={stateId} onChange={(e) => setState(e.target.value)}>
          {STATES.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.cameraCount})</option>)}
        </select>
        {selectedCameras.length > 0 && <span className="topbar-count">{selectedCameras.length} selected</span>}
      </div>
      <div className="topbar-actions">
        {selectedCameras.length > 0 && (
          <>
            {stateConfig.supportsVideo && (
              <div className="btn-group">
                <button className={`btn-icon ${mode === 'video' ? 'btn-active' : ''}`} onClick={() => setMode(undefined)} title="Video"><Video size={16} /></button>
                <button className={`btn-icon ${mode === 'image' ? 'btn-active' : ''}`} onClick={() => setMode('image')} title="Images"><Image size={16} /></button>
              </div>
            )}
            <div className="topbar-divider" />
            <div className="btn-group">
              <button className={`btn-icon ${cardSize === 'sm' ? 'btn-active' : ''}`} onClick={() => setGrid('sm')} title="Small"><LayoutGrid size={16} /></button>
              <button className={`btn-icon ${cardSize === 'md' ? 'btn-active' : ''}`} onClick={() => setGrid(undefined)} title="Medium"><Grid3x3 size={16} /></button>
              <button className={`btn-icon ${cardSize === 'lg' ? 'btn-active' : ''}`} onClick={() => setGrid('lg')} title="Large"><Grid2x2 size={16} /></button>
            </div>
            <div className="topbar-divider" />
          </>
        )}
        <button className={`btn-icon ${view === 'map' ? 'btn-active' : ''}`} onClick={() => setView(view === 'map' ? undefined : 'map')} title="Map view"><MapIcon size={16} /></button>
        {view === 'map' && selectedCameras.length > 1 && (
          <button className="btn-icon" onClick={triggerLayout} title="Auto-layout"><Sparkles size={16} /></button>
        )}
        {selectedCameras.length > 0 && <button className="btn-icon" onClick={clearAll} title="Clear all"><Trash2 size={16} /></button>}
        <button className="btn-icon" onClick={onSidebarToggle} title="Toggle panel">
          {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </header>
  )
}
