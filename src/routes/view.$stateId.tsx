/* eslint-disable react-refresh/only-export-components */
import './view.css';

import { createFileRoute } from '@tanstack/react-router';

import { CameraFeed } from '../components/CameraFeed';
import { DetailModal } from '../components/DetailModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SplitView } from '../components/SplitView';
import { CURATED_ROUTES } from '../lib/routes';
import { TrafficProvider, useTraffic } from '../lib/TrafficContext';
import { type ViewSearchParams } from '../lib/types';

export const Route = createFileRoute('/view/$stateId')({
  component: () => (
    <ErrorBoundary>
      <TrafficProvider>
        <Home />
      </TrafficProvider>
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>): ViewSearchParams => ({
    selected: (search.selected as string) || undefined,
    map: search.map === '0' ? '0' : undefined,
    list: search.list === '0' ? '0' : undefined,
    detail: (search.detail as string) || undefined,
    tab: search.tab === 'regions' ? 'regions' : undefined,
    panel: search.panel === '1' ? '1' : undefined,
  }),
});

export function EmptyState({ stateId, selectRoute, onBrowse, showMap }: { stateId: string; selectRoute: (ids: string[]) => void; onBrowse: () => void; showMap?: boolean }) {
  const hasCuratedRoutes = stateId === 'sc';

  return (
    <div className="empty-state">
      <p className="empty-title">No Selected Cameras</p>
      {hasCuratedRoutes ? (
        <div className="quick-routes">
          {CURATED_ROUTES.map((route) => (
            <button key={route.name} className="quick-route-btn" onClick={() => selectRoute(route.ids)}>
              {route.name} <span className="quick-route-count">{route.ids.length}</span>
            </button>
          ))}
        </div>
      ) : (
        <a className="empty-browse" href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">Request Curated Route</a>
      )}
      {hasCuratedRoutes && (
        <a className="empty-browse" href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">Request Curated Route</a>
      )}
      <div className="empty-actions">
        <button className="quick-route-btn" onClick={onBrowse}>Browse Cameras</button>
        {showMap && <p className="empty-hint">or select markers on the map</p>}
      </div>
    </div>
  );
}

function Home() {
  const { isLoading, stateId, selectedCameras, mode, showMap, cardSize, density, sidebarOpen, toggleCamera, selectRoute, setSidebarOpen, setDetailCam } = useTraffic();

  if (isLoading) {
    return <div className="loading">Loading cameras...</div>;
  }

  return (
    <div className={`page ${density === 'compact' ? 'density-compact' : ''}`}>
      <Header sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="layout">
        <div className="main">
          <div className={`viewer-area ${showMap ? 'viewer-area-split' : ''}`}>
            {showMap ? (
              <SplitView stateId={stateId} onBrowse={() => setSidebarOpen(true)} />
            ) : selectedCameras.length === 0 ? (
              <EmptyState stateId={stateId} selectRoute={selectRoute} onBrowse={() => setSidebarOpen(true)} showMap={showMap} />
            ) : (
                <div className={`viewer-grid viewer-grid-${cardSize}`}>
                  {selectedCameras.map((cam) => (
                    <CameraFeed
                      key={cam.id}
                      camera={cam}
                      mode={mode}
                      onRemove={() => toggleCamera(cam.id)}
                      setDetailCam={setDetailCam}
                      refreshInterval={mode === 'image' ? 30 : 0}
                    />
                  ))}
                </div>
            )}
          </div>
        </div>

        <div className={`sidebar-backdrop ${sidebarOpen ? 'sidebar-backdrop-visible' : ''}`} onClick={() => setSidebarOpen(false)} />
        <Sidebar open={sidebarOpen} />
      </div>
      <Footer />
      <DetailModal />
    </div>
  );
}
