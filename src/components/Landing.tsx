import './Landing.css';

import { Link } from '@tanstack/react-router';
import { Camera, Map, Share2, Smartphone } from 'lucide-react';

import { STATES } from '../lib/cameras';
import { emptyViewSearch } from '../lib/types';
import { Footer } from './Footer';

export function Landing() {
  const totalCameras = STATES.reduce((sum, s) => sum + s.cameraCount, 0);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Roadie by Bobby Earl</h1>
          <p className="hero-subtitle">
            View {totalCameras.toLocaleString()} live traffic cameras across {STATES.length} states.
          </p>
          <div className="hero-actions">
            <Link to="/view" search={{ ...emptyViewSearch, view: 'map' }} className="hero-cta">
              View Map
            </Link>
            <Link to="/view" search={emptyViewSearch} className="hero-cta-secondary">
              View List
            </Link>
          </div>
        </div>
        <p className="hero-credit">
          Photo by{' '}
          <a
            href="https://www.pexels.com/photo/arthur-ravenel-jr-bridge-at-sunset-13185339/"
            target="_blank"
            rel="noopener"
          >
            Pexels
          </a>
        </p>
      </section>

      <section className="features">
        <div className="feature">
          <Camera size={24} />
          <h3>Multi-Camera Viewing</h3>
          <p>Select multiple cameras and watch them side by side. Perfect for monitoring your commute.</p>
        </div>
        <div className="feature">
          <Map size={24} />
          <h3>Interactive Map</h3>
          <p>Browse cameras on a map. Drag feeds to arrange them. Auto-layout keeps things organized.</p>
        </div>
        <div className="feature">
          <Smartphone size={24} />
          <h3>Mobile Ready</h3>
          <p>Works on your phone. Check traffic before you leave or at a stoplight.</p>
        </div>
        <div className="feature">
          <Share2 size={24} />
          <h3>Shareable URLs</h3>
          <p>Every selection is saved in the URL. Bookmark your commute or share it with others.</p>
        </div>
      </section>

      <section className="states">
        <h2>Available States</h2>
        <div className="state-grid">
          {STATES.map((s) => (
            <Link
              key={s.id}
              to="/view"
              search={{ ...emptyViewSearch, state: s.id === 'sc' ? undefined : s.id }}
              className="state-card"
            >
              <span className="state-card-name">{s.name}</span>
              <span className="state-card-count">{s.cameraCount.toLocaleString()} cameras</span>
              {s.supportsVideo && <span className="state-card-badge">Live video</span>}
              {!s.supportsVideo && <span className="state-card-badge state-card-badge-muted">Image only</span>}
              {s.id === 'sc' && <span className="state-card-badge state-card-badge-routes">Curated routes</span>}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
