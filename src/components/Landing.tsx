import './Landing.css';

import { Link } from '@tanstack/react-router';
import { Camera, Info, Map, Share2, Smartphone } from 'lucide-react';

import { STATES } from '../lib/cameras';
import { emptyViewSearch } from '../lib/types';
import { Footer } from './Footer';

export function Landing() {
  const totalCameras = STATES.reduce((sum, s) => sum + s.cameraCount, 0);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Roadie App <span className="beta-badge beta-badge-lg">BETA</span></h1>
          <p className="hero-subtitle">
            {totalCameras.toLocaleString()} live traffic cameras across {STATES.length} states.
          </p>
          <div className="hero-actions">
            <Link to="/view/$stateId" params={{ stateId: 'all' }} search={emptyViewSearch} className="hero-cta">
              Open Map
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

      <section className="attribution">
        <p className="attribution-text">
          Camera feeds provided by state departments of transportation. Not affiliated with or endorsed by any government agency.
        </p>
        <div className="attribution-links">
          <a href="https://algotraffic.com" target="_blank" rel="noopener">ALGO Traffic (AL)</a>
          <a href="https://cwwp2.dot.ca.gov" target="_blank" rel="noopener">Caltrans (CA)</a>
          <a href="https://ctroads.org" target="_blank" rel="noopener">CTRoads</a>
          <a href="https://tmc.deldot.gov" target="_blank" rel="noopener">DelDOT</a>
          <a href="https://fl511.com" target="_blank" rel="noopener">FL 511</a>
          <a href="https://511ga.org" target="_blank" rel="noopener">GA 511</a>
          <a href="https://chart.maryland.gov" target="_blank" rel="noopener">MD CHART</a>
          <a href="https://www.drivenc.gov" target="_blank" rel="noopener">DriveNC</a>
          <a href="https://www.511nj.org" target="_blank" rel="noopener">NJ 511</a>
          <a href="https://www.511pa.com" target="_blank" rel="noopener">PA 511</a>
          <a href="https://www.511sc.org" target="_blank" rel="noopener">SC 511</a>
          <a href="https://smartway.tn.gov" target="_blank" rel="noopener">TN SmartWay</a>
          <a href="https://www.udottraffic.utah.gov" target="_blank" rel="noopener">UDOT Traffic</a>
          <a href="https://www.511virginia.org" target="_blank" rel="noopener">VA 511</a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
