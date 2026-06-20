import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TrafficProvider, useTraffic } from '../lib/TrafficContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { TopBar } from '../components/TopBar'
import { CameraFeed } from '../components/CameraFeed'
import { CameraMap } from '../components/CameraMap'
import { Sidebar } from '../components/Sidebar'
import { DetailModal } from '../components/DetailModal'
import './index.css'

export const Route = createFileRoute('/')({
  component: () => (
    <ErrorBoundary>
      <TrafficProvider>
        <Home />
      </TrafficProvider>
    </ErrorBoundary>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    state: (search.state as string) || undefined,
    mode: search.mode === 'image' ? 'image' : undefined,
    selected: (search.selected as string) || undefined,
    view: search.view === 'map' ? 'map' : undefined,
    grid: ['sm', 'lg'].includes(search.grid as string) ? (search.grid as string) : undefined,
    detail: (search.detail as string) || undefined,
    tab: search.tab === 'regions' ? 'regions' : undefined,
  }),
})

function Home() {
  const { isLoading, stateId, selectedCameras, mode, view, cardSize, toggleCamera, setDetailCam } = useTraffic()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (isLoading) return <div className="loading">Loading cameras...</div>

  return (
    <div className="layout">
      <div className="main">
        <TopBar sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="viewer-area">
          {view === 'map' ? (
            <CameraMap key={stateId} stateId={stateId} />
          ) : selectedCameras.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">Select cameras to view</p>
              <p className="empty-desc">Use the panel on the right to browse and select cameras by region</p>
            </div>
          ) : (
            <div className={`viewer-grid viewer-grid-${cardSize}`}>
              {selectedCameras.map((cam) => (
                <CameraFeed key={cam.id} camera={cam} mode={mode} onRemove={() => toggleCamera(cam.id)} setDetailCam={setDetailCam} />
              ))}
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && <Sidebar />}
      <DetailModal />
    </div>
  )
}
