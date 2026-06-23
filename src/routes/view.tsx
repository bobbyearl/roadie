/* eslint-disable react-refresh/only-export-components */
import './view.css';

import { createFileRoute } from '@tanstack/react-router';


import { CameraFeed } from '../components/CameraFeed';
import { CameraMap } from '../components/CameraMap';
import { DetailModal } from '../components/DetailModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SplitView } from '../components/SplitView';
import { type Camera } from '../lib/cameras';
import { TrafficProvider, useTraffic } from '../lib/TrafficContext';
import { CURATED_ROUTES } from '../lib/routes';
import { type ViewSearchParams } from '../lib/types';

export const Route = createFileRoute('/view')({
  component: () => (
    <ErrorBoundary>
      <TrafficProvider>
        <Home />
      </TrafficProvider>
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>): ViewSearchParams => ({
    state: (search.state as string) || undefined,
    mode: search.mode === 'image' ? 'image' : undefined,
    selected: (search.selected as string) || undefined,
    view: ['map', 'split'].includes(search.view as string) ? (search.view as string) : undefined,
    grid: ['sm', 'lg'].includes(search.grid as string) ? (search.grid as string) : undefined,
    detail: (search.detail as string) || undefined,
    tab: search.tab === 'regions' ? 'regions' : undefined,
    sw: search.sw ? String(search.sw) : undefined,
    panel: search.panel === '1' ? '1' : undefined,
  }),
});

export function EmptyState({ cameras, stateId, selectRoute, onBrowse, onSwitchToMap }: { cameras?: Camera[]; stateId: string; selectRoute: (ids: string[]) => void; onBrowse: () => void; onSwitchToMap: () => void }) {
  const hasCuratedRoutes = stateId === 'sc';

  return (
    <div className="empty-state">
      <p className="empty-title">Quick Start</p>
      {hasCuratedRoutes ? (
        <div className="quick-routes">
          {CURATED_ROUTES.map((route) => (
            <button key={route.name} className="quick-route-btn" onClick={() => selectRoute(route.ids)}>
              {route.name} <span className="quick-route-count">{route.ids.length}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-desc">No Selected Cameras</p>
      )}
      <div className="empty-actions">
        <div className="quick-routes">
          <button className="quick-route-btn" onClick={onBrowse}>Browse Cameras</button>
          <button className="quick-route-btn" onClick={onSwitchToMap}>Use Map</button>
        </div>
        <a className="empty-browse" href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">Request Curated Route</a>
      </div>
    </div>
  );
}

function Home() {
  const { isLoading, stateId, cameras, selectedCameras, stateConfig, mode, view, cardSize, sidebarOpen, toggleCamera, selectRoute, setSidebarOpen, setView, setDetailCam } = useTraffic();

  if (isLoading) {
    return <div className="loading">Loading cameras...</div>;
  }

  return (
    <div className="page">
      <Header sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="layout">
        <div className="main">
          <div className={`viewer-area ${view === 'split' ? 'viewer-area-split' : ''}`}>
            {view === 'map' ? (
              <CameraMap key={stateId} stateId={stateId} />
            ) : view === 'split' ? (
              <SplitView stateId={stateId} onBrowse={() => setSidebarOpen(true)} />
            ) : selectedCameras.length === 0 ? (
              <EmptyState cameras={cameras} stateId={stateId} selectRoute={selectRoute} onBrowse={() => setSidebarOpen(true)} onSwitchToMap={() => setView('map')} />
            ) : (
                <div className={`viewer-grid viewer-grid-${cardSize}`}>
                  {selectedCameras.map((cam) => (
                    <CameraFeed
                      key={cam.id}
                      camera={cam}
                      mode={mode}
                      onRemove={() => toggleCamera(cam.id)}
                      setDetailCam={setDetailCam}
                    />
                  ))}
                </div>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <>
            <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </>
        )}
      </div>
      <DetailModal />
    </div>
  );
}
