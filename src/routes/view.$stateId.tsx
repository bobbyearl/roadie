/* eslint-disable react-refresh/only-export-components */
import './view.css';

import { createFileRoute } from '@tanstack/react-router';

import { CameraFeed } from '../components/CameraFeed';
import { DetailModal } from '../components/DetailModal';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SplitView } from '../components/SplitView';
import { type Camera } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { useTraffic } from '../lib/TrafficContext';
import { type ViewSearchParams } from '../lib/types';

export const Route = createFileRoute('/view/$stateId')({
  validateSearch: (search: Record<string, unknown>): ViewSearchParams => ({
    selected: (search.selected as string) || undefined,
    detail: (search.detail as string) || undefined,
    tab: search.tab === 'regions' ? 'regions' : undefined,
    panel: search.panel === '1' ? '1' : undefined,
    lat: search.lat ? Number(search.lat) : undefined,
    lng: search.lng ? Number(search.lng) : undefined,
    z: search.z ? Number(search.z) : undefined,
  }),
});

export function EmptyState({ stateId, cameras, selectRoute, toggleCamera, onBrowse, showMap }: { stateId: string; cameras: Camera[]; selectRoute: (ids: string[]) => void; toggleCamera: (id: string) => void; onBrowse: () => void; showMap?: boolean }) {
  const hasCuratedRoutes = stateId === 'sc';
  const { findClosest } = useTraffic();

  return (
    <div className="empty-state">
      <p className="empty-title">No Selected Cameras</p>

      {hasCuratedRoutes ? (
        <>
          <p className="empty-map-hint empty-route-hint">Try a Curated Route or <a className="empty-browse" href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">Request Curated Route</a></p>
          <div className="quick-routes">
            {CURATED_ROUTES.map((route) => (
              <button key={route.name} className="quick-route-btn" onClick={() => selectRoute(route.ids.map((id) => `sc:${id}`))}>
                {route.name} <span className="quick-route-count">{route.ids.length}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-map-hint empty-route-hint"><a className="empty-browse" href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">Request Curated Route</a></p>
      )}

      <div className="empty-actions">
        <div className="quick-routes">
          <button className="quick-route-btn" onClick={findClosest}>Open Closest Camera</button>
          <button className="quick-route-btn" onClick={onBrowse}>Browse Cameras</button>
        </div>
        {showMap && <p className="empty-map-hint">or select a map marker</p>}
      </div>
    </div>
  );
}

export function Home() {
  const { stateId, cameras, selectedCameras, mode, showMap, showList, cardSize, density, sidebarOpen, toggleCamera, selectRoute, setSidebarOpen, toggleMap, toggleList, setDetailCam } = useTraffic();

  return (
    <div className={`page ${density === 'compact' ? 'density-compact' : ''}`}>
      <Header sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="layout">
        <div className="main">
          <div className={`viewer-area ${showMap ? 'viewer-area-split' : ''}`}>
            {showMap ? (
              <SplitView stateId={stateId} onBrowse={() => setSidebarOpen(true)} onCloseMap={showList ? toggleMap : undefined} onCloseList={showList ? toggleList : undefined} />
            ) : selectedCameras.length === 0 ? (
              <EmptyState stateId={stateId} cameras={cameras} selectRoute={selectRoute} toggleCamera={toggleCamera} onBrowse={() => setSidebarOpen(true)} showMap={showMap} />
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
