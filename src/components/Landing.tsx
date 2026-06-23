import './Landing.css';

import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Camera, Info, Map, Share2, Smartphone } from 'lucide-react';
import { useEffect } from 'react';

import { getStateConfig, STATES } from '../lib/cameras';
import { emptyViewSearch } from '../lib/types';
import { Footer } from './Footer';

export function Landing() {
  const queryClient = useQueryClient();

  // Prefetch default state data so map loads instantly on navigation
  useEffect(() => {
    const sc = getStateConfig('sc');
    queryClient.prefetchQuery({
      queryKey: ['cameras', 'sc'],
      queryFn: async () => {
        const res = await fetch(import.meta.env.BASE_URL + sc.dataFile);
        return sc.parser(await res.json());
      },
      staleTime: Infinity,
    });
  }, [queryClient]);
  const totalCameras = STATES.reduce((sum, s) => sum + s.cameraCount, 0);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">RoadieApp</h1>
          <p className="hero-subtitle">
            View {totalCameras.toLocaleString()} live traffic cameras across {STATES.length} states.
          </p>
          <div className="hero-actions">
            <Link to="/view" search={emptyViewSearch} className="hero-cta">
              Get Started
            </Link>
          </div>
        </div>
        <p className="hero-credit">
          <a
            href="https://www.pexels.com/photo/arthur-ravenel-jr-bridge-at-sunset-13185339/"
            target="_blank"
            rel="noopener"
          >
            <Info size={16} />
          </a>
        </p>
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
              <span className="state-card-badges">
                {s.supportsVideo && <span className="state-card-badge">Live Video</span>}
                {!s.supportsVideo && <span className="state-card-badge state-card-badge-muted">Live Images</span>}
                {s.id === 'sc' && <span className="state-card-badge state-card-badge-routes">Curated Routes</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <Camera size={24} />
          <div>
            <h3>Multi-Camera Viewing</h3>
            <p>Select multiple cameras and watch them side by side. Perfect for monitoring your commute.</p>
          </div>
        </div>
        <div className="feature">
          <Map size={24} />
          <div>
            <h3>Interactive Map</h3>
            <p>Browse cameras on a map. Drag feeds to arrange them. Auto-layout keeps things organized.</p>
          </div>
        </div>
        <div className="feature">
          <Smartphone size={24} />
          <div>
            <h3>Mobile Ready</h3>
            <p>Works on your phone. Check traffic before you leave or at a stoplight.</p>
          </div>
        </div>
        <div className="feature">
          <Share2 size={24} />
          <div>
            <h3>Shareable URLs</h3>
            <p>Every selection is saved in the URL. Bookmark your commute or share it with others.</p>
          </div>
        </div>
      </section>

      <section className="credits">
        <div className="credits-card">
          <h3>High Five ✋</h3>
          <p>
            Like the site? Share it with someone who white-knuckles their commute every day. Or help fund the gas money that keeps this thing running.
          </p>
          <a href="https://www.paypal.com/paypalme/bobbyearl" target="_blank" rel="noopener" className="credits-btn">
            Chip in for Gas
          </a>
        </div>
        <div className="credits-card">
          <h3>Inspiration 💡</h3>
          <p>
            Shout out to <a href="https://www.511sc.org" target="_blank" rel="noopener">511sc.org</a> for making camera feeds publicly available.
            I just wanted to see more than one at a time, like a traffic control room from my couch.
          </p>
          <a href="https://github.com/bobbyearl/roadie/blob/main/CHANGELOG.md" target="_blank" rel="noopener" className="credits-btn">
            View Changelog
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
