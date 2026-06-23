import './Footer.css';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '../lib/ThemeContext';

export function Footer() {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="site-footer">
      <div className="site-footer-left">
        <div className="btn-group">
          <button className={`btn-icon ${theme === 'system' ? 'btn-active' : ''}`} onClick={() => setTheme('system')} title="System"><Monitor size={14} /></button>
          <button className={`btn-icon ${theme === 'light' ? 'btn-active' : ''}`} onClick={() => setTheme('light')} title="Light"><Sun size={14} /></button>
          <button className={`btn-icon ${theme === 'dark' ? 'btn-active' : ''}`} onClick={() => setTheme('dark')} title="Dark"><Moon size={14} /></button>
        </div>
      </div>
      <nav className="site-footer-links">
        <a href="https://www.bobbyearl.com" target="_blank" rel="noopener">Built by Bobby Earl</a>
        <span className="site-footer-divider">|</span>
        <a href="https://www.paypal.com/paypalme/bobbyearl" target="_blank" rel="noopener">Gas Money</a>
        <span className="site-footer-divider">|</span>
        <a href="https://github.com/bobbyearl/roadie/issues/new?labels=bug" target="_blank" rel="noopener">Backseat Driver</a>
      </nav>
    </footer>
  );
}
