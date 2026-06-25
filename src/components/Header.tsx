import './Header.css';

import { Link } from '@tanstack/react-router';
import {
  PanelRightClose,
  PanelRightOpen,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { useTraffic } from '../lib/TrafficContext';
import { IconButton } from './IconButton';
import { PrefsButton } from './PrefsPopover';
import { StateIcon, StateSelector } from './StateSelector';

interface HeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export function Header({ sidebarOpen, onSidebarToggle }: HeaderProps) {
  const { stateId, showMap, showList, selectedCameras, clearAll, triggerLayout } = useTraffic();

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
        <div className="header-bar-left">
          <StateIcon id={stateId} />
          <h1 className="header-bar-title"><Link to="/">Roadie App</Link></h1>
          <StateSelector />
        </div>
        <div className="header-nav-right">
          {showMap && !showList && (
            <IconButton icon={Sparkles} label="Layout" onClick={triggerLayout} disabled={selectedCameras.length < 2} />
          )}
          <IconButton icon={Share2} label="Share" onClick={handleShare} title="Share" />
          <PrefsButton />
          <IconButton icon={sidebarOpen ? PanelRightClose : PanelRightOpen} label="Browse" onClick={onSidebarToggle} active={sidebarOpen} />
        </div>
      </div>
      <div className={`header-tab ${selectedCameras.length > 0 ? 'header-tab-visible' : ''}`}>
        <span className="header-tab-count">{selectedCameras.length} selected</span>
        <button className="btn-label header-tab-clear" onClick={clearAll} disabled={selectedCameras.length === 0}><Trash2 size={12} /> Clear</button>
      </div>
    </header>
  );
}
