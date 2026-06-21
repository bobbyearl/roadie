import './Footer.css';

import { Link } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '../lib/ThemeContext';
import { emptyViewSearch } from '../lib/types';

export function Footer() {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="site-footer">
      <div className="site-footer-left">
        <span className="site-footer-brand">
          Roadie by{' '}
          <a href="https://www.bobbyearl.com" target="_blank">
            Bobby Earl
          </a>
        </span>
        <div className="theme-switcher">
          <button
            className={`theme-btn ${theme === 'system' ? 'theme-btn-active' : ''}`}
            onClick={() => setTheme('system')}
            title="System"
          >
            <Monitor size={12} />
          </button>
          <button
            className={`theme-btn ${theme === 'light' ? 'theme-btn-active' : ''}`}
            onClick={() => setTheme('light')}
            title="Light"
          >
            <Sun size={12} />
          </button>
          <button
            className={`theme-btn ${theme === 'dark' ? 'theme-btn-active' : ''}`}
            onClick={() => setTheme('dark')}
            title="Dark"
          >
            <Moon size={12} />
          </button>
        </div>
      </div>
      <nav className="site-footer-links">
        <Link to="/">Home</Link>
        <Link to="/view" search={emptyViewSearch}>
          View Cameras
        </Link>
        <a href="https://github.com/bobbyearl/roadie/issues/new?labels=bug" target="_blank" rel="noopener">
          Report a Problem
        </a>
        <a href="https://github.com/bobbyearl/roadie" target="_blank" rel="noopener">
          GitHub
        </a>
      </nav>
    </footer>
  );
}
