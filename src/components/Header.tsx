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
import { useState } from 'react';

import { STATES } from '../lib/cameras';
import { useTraffic } from '../lib/TrafficContext';
import { IconButton } from './IconButton';
import { PrefsPopover } from './PrefsPopover';

interface HeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export function Header({ sidebarOpen, onSidebarToggle }: HeaderProps) {
  const { stateId, cameras, showMap, showList, selectedCameras, setState, clearAll, triggerLayout } = useTraffic();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [hasSeenPrefs, setHasSeenPrefs] = useState(() => localStorage.getItem('roadie-prefs-seen') === '1');

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
            <IconButton icon={Sparkles} label="Layout" onClick={triggerLayout} disabled={selectedCameras.length < 2} />
          )}
          <IconButton icon={Share2} label="Share" onClick={handleShare} title="Share" />
          <div className="prefs-anchor">
            <IconButton icon={Settings} label="View Options" onClick={openPrefs} active={prefsOpen} title="View Options">
              {!hasSeenPrefs && <span className="prefs-dot" />}
            </IconButton>
            {prefsOpen && <PrefsPopover onClose={() => setPrefsOpen(false)} />}
          </div>
          <IconButton icon={sidebarOpen ? PanelRightClose : PanelRightOpen} label="Browse" onClick={onSidebarToggle} active={sidebarOpen} />
        </div>
      </div>
      <div className="header-tab">
        <span className="header-tab-count">{selectedCameras.length}/{cameras.length}</span>
        <button className="header-tab-clear" onClick={clearAll} disabled={selectedCameras.length === 0}><Trash2 size={12} /></button>
      </div>

    </header>
  );
}
