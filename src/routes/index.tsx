import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type Camera, type CameraGeoJSON, parseCameras } from '../lib/cameras'
import { List, Map, Image, Video, X, Search } from 'lucide-react'

type SearchParams = {
  view?: string
  mode?: string
  selected?: string
  route?: string
  region?: string
  search?: string
}

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: search.view === 'map' ? 'map' : undefined,
    mode: search.mode === 'video' ? 'video' : undefined,
    selected: (search.selected as string) || undefined,
    route: (search.route as string) || undefined,
    region: (search.region as string) || undefined,
    search: (search.search as string) || undefined,
  }),
})

function useCameras() {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const res = await fetch(import.meta.env.BASE_URL + 'data/cameras.geojson')
      const geojson: CameraGeoJSON = await res.json()
      return parseCameras(geojson)
    },
    staleTime: Infinity,
  })
}

function Home() {
  const params = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const { data: cameras = [], isLoading } = useCameras()

  const view = params.view ?? 'list'
  const mode = params.mode ?? 'image'
  const selectedIds = useMemo(() => params.selected?.split(',').filter(Boolean) ?? [], [params.selected])
  const routeFilter = params.route ?? ''
  const regionFilter = params.region ?? ''
  const searchFilter = params.search ?? ''

  const setParam = (updates: Partial<SearchParams>) => {
    const next: SearchParams = { ...params, ...updates }
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(next)) {
      if (v) clean[k] = v
    }
    navigate({ search: clean })
  }

  const toggleSelected = (id: string) => {
    const current = new Set(selectedIds)
    if (current.has(id)) current.delete(id)
    else current.add(id)
    setParam({ selected: current.size ? [...current].join(',') : undefined })
  }

  const clearSelected = () => setParam({ selected: undefined })

  const filtered = useMemo(() => {
    return cameras.filter((c) => {
      if (routeFilter && c.route !== routeFilter) return false
      if (regionFilter && c.jurisdiction !== regionFilter) return false
      if (searchFilter && !c.description.toLowerCase().includes(searchFilter.toLowerCase())) return false
      return true
    })
  }, [cameras, routeFilter, regionFilter, searchFilter])

  const selectedCameras = useMemo(
    () => cameras.filter((c) => selectedIds.includes(c.id)),
    [cameras, selectedIds],
  )

  const routes = useMemo(() => [...new Set(cameras.map((c) => c.route))].sort(), [cameras])
  const regions = useMemo(() => [...new Set(cameras.map((c) => c.jurisdiction.trim()))].sort(), [cameras])

  if (isLoading) {
    return <div className="loading">Loading cameras...</div>
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">Bobby Earl Traffic</h1>
        <p className="header-subtitle">{cameras.length} SC traffic cameras</p>
      </header>

      {selectedCameras.length > 0 && (
        <section className="viewer">
          <div className="viewer-header">
            <span className="viewer-count">{selectedCameras.length} selected</span>
            <div className="viewer-controls">
              <button
                className={`btn-icon ${mode === 'image' ? 'btn-active' : ''}`}
                onClick={() => setParam({ mode: undefined })}
                title="Images"
              >
                <Image size={16} />
              </button>
              <button
                className={`btn-icon ${mode === 'video' ? 'btn-active' : ''}`}
                onClick={() => setParam({ mode: 'video' })}
                title="Video"
              >
                <Video size={16} />
              </button>
              <button className="btn-icon" onClick={clearSelected} title="Clear all">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="viewer-grid">
            {selectedCameras.map((cam) => (
              <CameraFeed key={cam.id} camera={cam} mode={mode} onRemove={() => toggleSelected(cam.id)} />
            ))}
          </div>
        </section>
      )}

      <div className="toolbar">
        <div className="toolbar-filters">
          <div className="search-input">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search cameras..."
              value={searchFilter}
              onChange={(e) => setParam({ search: e.target.value || undefined })}
            />
          </div>
          <select value={routeFilter} onChange={(e) => setParam({ route: e.target.value || undefined })}>
            <option value="">All routes</option>
            {routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={regionFilter} onChange={(e) => setParam({ region: e.target.value || undefined })}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="toolbar-views">
          <button className={`btn-icon ${view === 'list' ? 'btn-active' : ''}`} onClick={() => setParam({ view: undefined })}>
            <List size={16} />
          </button>
          <button className={`btn-icon ${view === 'map' ? 'btn-active' : ''}`} onClick={() => setParam({ view: 'map' })}>
            <Map size={16} />
          </button>
        </div>
      </div>

      <div className="camera-list">
        <p className="result-count">{filtered.length} cameras</p>
        <div className="camera-grid">
          {filtered.map((cam) => (
            <CameraCard
              key={cam.id}
              camera={cam}
              selected={selectedIds.includes(cam.id)}
              onToggle={() => toggleSelected(cam.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CameraCard({ camera, selected, onToggle }: { camera: Camera; selected: boolean; onToggle: () => void }) {
  return (
    <div className={`camera-card ${selected ? 'camera-card-selected' : ''}`} onClick={onToggle}>
      <img src={camera.image_url} alt={camera.description} loading="lazy" />
      <div className="camera-card-info">
        <p className="camera-card-title">{camera.description}</p>
        <p className="camera-card-meta">{camera.route} · {camera.jurisdiction}</p>
      </div>
    </div>
  )
}

function CameraFeed({ camera, mode, onRemove }: { camera: Camera; mode: string; onRemove: () => void }) {
  return (
    <div className="feed-item">
      <div className="feed-header">
        <span className="feed-title">{camera.description}</span>
        <button className="btn-icon-sm" onClick={onRemove}><X size={12} /></button>
      </div>
      {mode === 'video' ? (
        <video src={camera.video_url} autoPlay muted playsInline controls />
      ) : (
        <img src={camera.image_url} alt={camera.description} />
      )}
    </div>
  )
}
