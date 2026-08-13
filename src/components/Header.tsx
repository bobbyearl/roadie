import './Header.css';

import { Link } from '@tanstack/react-router';
import {
  Bookmark,
  PanelRightClose,
  PanelRightOpen,
  Share2,
  Sparkles,
} from 'lucide-react';

import { useTraffic } from '../lib/TrafficContext';
import { IconButton } from './IconButton';
import { BookmarksModal } from './BookmarksModal';
import { StateIcon, StateSelector } from './StateSelector';

interface HeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export function Header({ sidebarOpen, onSidebarToggle }: HeaderProps) {
  const { stateId, showMap, showList, selectedCameras, triggerLayout } = useTraffic();

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Roadie App', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      <header className="header-bar">
        <div className="header-nav">
          <div className="header-bar-left">
            <StateIcon id={stateId} />
            <h1 className="header-bar-title"><Link to="/">Roadie App</Link> <span className="beta-badge">BETA</span></h1>
            <StateSelector />
          </div>
          <div className="header-nav-right">
            {showMap && !showList && (
              <IconButton icon={Sparkles} label="Layout" onClick={triggerLayout} disabled={selectedCameras.length < 2} />
            )}
            <IconButton icon={Bookmark} label="Bookmarks" onClick={() => window.dispatchEvent(new Event('open-bookmarks-modal'))} />
            <IconButton icon={Share2} label="Share" onClick={handleShare} title="Share" />
            <IconButton icon={sidebarOpen ? PanelRightClose : PanelRightOpen} label="Browse" onClick={onSidebarToggle} active={sidebarOpen} />
          </div>
        </div>
      </header>

      <BookmarksModal />
    </>
  );
}
