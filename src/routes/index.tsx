import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { type Camera, type CameraGeoJSON, parseCameras } from '../lib/cameras'
import { CURATED_ROUTES } from '../lib/routes'
import { Image, Video, X, Search, ChevronDown, ChevronRight, Trash2, PanelRightClose, PanelRightOpen, Grid2x2, Grid3x3, LayoutGrid, MapIcon, GripVertical } from 'lucide-react'

type SearchParams = {
  mode?: string
  selected?: string
  view?: string
  grid?: string
}

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    mode: search.mode === 'image' ? 'image' : undefined,
    selected: (search.selected as string) || undefined,
    view: search.view === 'map' ? 'map' : undefined,
    grid: ['sm', 'lg'].includes(search.grid as string) ? (search.grid as string) : undefined,
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const [sidebarTab, setSidebarTab] = useState<'routes' | 'regions'>('routes')

  const mode = params.mode ?? 'video'
  const view = params.view ?? 'feeds'
  const cardSize = params.grid ?? 'md'
  const selectedIds = useMemo(() => new Set(params.selected?.split(',').filter(Boolean) ?? []), [params.selected])

  const setSelected = (ids: Set<string>) => {
    const val = ids.size ? [...ids].join(',') : undefined
    navigate({ search: { ...params, selected: val } })
  }

  const toggleCamera = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const clearAll = () => setSelected(new Set())

  const selectRoute = (ids: string[]) => setSelected(new Set(ids))

  const activeRouteName = useMemo(() => {
    const joined = [...selectedIds].sort().join(',')
    return CURATED_ROUTES.find((r) => [...r.ids].sort().join(',') === joined)?.name
  }, [selectedIds])

  const toggleRegion = (region: string) => {
    const next = new Set(expandedRegions)
    if (next.has(region)) next.delete(region)
    else next.add(region)
    setExpandedRegions(next)
  }

  const regionGroups = useMemo(() => {
    const map = new Map<string, Camera[]>()
    for (const c of cameras) {
      const r = c.jurisdiction.trim()
      if (!map.has(r)) map.set(r, [])
      map.get(r)!.push(c)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [cameras])

  const filteredRegionGroups = useMemo(() => {
    if (!searchText) return regionGroups
    const q = searchText.toLowerCase()
    return regionGroups
      .map(([region, cams]) => [region, cams.filter((c) => c.description.toLowerCase().includes(q))] as [string, Camera[]])
      .filter(([, cams]) => cams.length > 0)
  }, [regionGroups, searchText])

  const selectedCameras = useMemo(
    () => cameras.filter((c) => selectedIds.has(c.id)),
    [cameras, selectedIds],
  )

  if (isLoading) {
    return <div className="loading">Loading cameras...</div>
  }

  return (
    <div className="layout">
      {/* Main content */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">Bobby Earl Traffic</h1>
            {selectedCameras.length > 0 && (
              <span className="topbar-count">{selectedCameras.length} cameras selected</span>
            )}
          </div>
          <div className="topbar-actions">
            {selectedCameras.length > 0 && (
              <>
                <div className="btn-group">
                  <button
                    className={`btn-icon ${mode === 'video' ? 'btn-active' : ''}`}
                    onClick={() => navigate({ search: { ...params, mode: undefined } })}
                    title="Video"
                  >
                    <Video size={16} />
                  </button>
                  <button
                    className={`btn-icon ${mode === 'image' ? 'btn-active' : ''}`}
                    onClick={() => navigate({ search: { ...params, mode: 'image' } })}
                    title="Images"
                  >
                    <Image size={16} />
                  </button>
                </div>
                <div className="topbar-divider" />
                <div className="btn-group">
                  <button
                    className={`btn-icon ${cardSize === 'sm' ? 'btn-active' : ''}`}
                    onClick={() => navigate({ search: { ...params, grid: 'sm' } })}
                    title="Small"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    className={`btn-icon ${cardSize === 'md' ? 'btn-active' : ''}`}
                    onClick={() => navigate({ search: { ...params, grid: undefined } })}
                    title="Medium"
                  >
                    <Grid3x3 size={16} />
                  </button>
                  <button
                    className={`btn-icon ${cardSize === 'lg' ? 'btn-active' : ''}`}
                    onClick={() => navigate({ search: { ...params, grid: 'lg' } })}
                    title="Large"
                  >
                    <Grid2x2 size={16} />
                  </button>
                </div>
                <div className="topbar-divider" />
              </>
            )}
            <button
              className={`btn-icon ${view === 'map' ? 'btn-active' : ''}`}
              onClick={() => navigate({ search: { ...params, view: view === 'map' ? undefined : 'map' } })}
              title="Map view"
            >
              <MapIcon size={16} />
            </button>
            {selectedCameras.length > 0 && (
              <button className="btn-icon" onClick={clearAll} title="Clear all cameras">
                <Trash2 size={16} />
              </button>
            )}
            <button className="btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle panel">
              {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </header>

        {/* Viewer area */}
        <div className="viewer-area">
          {view === 'map' ? (
            <CameraMap cameras={cameras} selectedIds={selectedIds} onToggle={toggleCamera} cardSize={cardSize} />
          ) : selectedCameras.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">Select cameras to view</p>
              <p className="empty-desc">Use the panel on the right to browse and select cameras by region</p>
            </div>
          ) : (
            <div className={`viewer-grid viewer-grid-${cardSize}`}>
              {selectedCameras.map((cam) => (
                <CameraFeed key={cam.id} camera={cam} mode={mode} onRemove={() => toggleCamera(cam.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar: camera selector */}
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button className={`sidebar-tab ${sidebarTab === 'routes' ? 'sidebar-tab-active' : ''}`} onClick={() => setSidebarTab('routes')}>
              Routes
            </button>
            <button className={`sidebar-tab ${sidebarTab === 'regions' ? 'sidebar-tab-active' : ''}`} onClick={() => setSidebarTab('regions')}>
              Regions
            </button>
          </div>

          {sidebarTab === 'routes' && (
            <div className="sidebar-list">
              {CURATED_ROUTES.map((route) => (
                <button
                  key={route.name}
                  className={`route-item ${activeRouteName === route.name ? 'route-item-active' : ''}`}
                  onClick={() => selectRoute(route.ids)}
                >
                  <span className="route-item-name">{route.name}</span>
                  <span className="route-item-count">{route.ids.length}</span>
                </button>
              ))}
            </div>
          )}

          {sidebarTab === 'regions' && (
            <>
              <div className="sidebar-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Find in this list"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="sidebar-list">
                {filteredRegionGroups.map(([region, cams]) => {
                  const selectedInRegion = cams.filter((c) => selectedIds.has(c.id)).length
                  const expanded = expandedRegions.has(region)
                  return (
                    <div key={region} className="region-section">
                      <button className="region-header" onClick={() => toggleRegion(region)}>
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="region-label">{region}</span>
                        <span className="region-counter">{selectedInRegion}/{cams.length}</span>
                      </button>
                      {expanded && (
                        <div className="region-cameras">
                          {cams.map((cam) => (
                            <label key={cam.id} className="camera-row">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(cam.id)}
                                onChange={() => toggleCamera(cam.id)}
                              />
                              <span className="camera-row-label">{cam.description}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  )
}

function CameraFeed({ camera, mode, onRemove }: { camera: Camera; mode: string; onRemove: () => void }) {
  return (
    <div className="feed-item">
      <div className="feed-header">
        <span className="feed-title">{camera.description}</span>
        <button className="btn-icon-sm" onClick={onRemove} title="Remove"><X size={12} /></button>
      </div>
      {mode === 'video' ? (
        <video src={camera.video_url} autoPlay muted playsInline controls />
      ) : (
        <img src={camera.image_url} alt={camera.description} />
      )}
    </div>
  )
}

function CameraMap({ cameras, selectedIds, onToggle, cardSize }: { cameras: Camera[]; selectedIds: Set<string>; onToggle: (id: string) => void; cardSize: string }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''
  const mode = Route.useSearch().mode ?? 'video'

  if (!apiKey) {
    return (
      <div className="empty-state">
        <p className="empty-title">Map view requires a Google Maps API key</p>
        <p className="empty-desc">Add VITE_GOOGLE_MAPS_API_KEY to your .env file</p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapInner cameras={cameras} selectedIds={selectedIds} onToggle={onToggle} mode={mode} mapId={mapId} cardSize={cardSize} />
    </APIProvider>
  )
}

// Find the closest point on a rectangle's edge to a given point
function clampToRect(px: number, py: number, rectX: number, rectY: number, rectW: number, rectH: number) {
  // Clamp the point to the rectangle bounds
  return {
    x: Math.max(rectX, Math.min(px, rectX + rectW)),
    y: Math.max(rectY, Math.min(py, rectY + rectH)),
  }
}

function MapInner({ cameras, selectedIds, onToggle, mode, mapId, cardSize }: { cameras: Camera[]; selectedIds: Set<string>; onToggle: (id: string) => void; mode: string; mapId: string; cardSize: string }) {
  const map = useMap()
  const [offsets, setOffsets] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const didDragRef = useRef(false)
  const prevSelectedRef = useRef<Set<string>>(new Set())

  const cardWidthPx = cardSize === 'sm' ? 200 : cardSize === 'lg' ? 500 : 340

  // Auto-layout + zoom-to-fit when multiple cameras are selected at once
  useEffect(() => {
    const newIds = [...selectedIds].filter((id) => !prevSelectedRef.current.has(id))
    prevSelectedRef.current = new Set(selectedIds)
    if (newIds.length <= 1) return

    // Get camera objects for the new IDs
    const newCams = newIds.map((id) => cameras.find((c) => c.id === id)).filter(Boolean) as Camera[]

    // Zoom to fit the new cameras
    if (map) {
      const bounds = new google.maps.LatLngBounds()
      for (const cam of newCams) bounds.extend({ lat: cam.lat, lng: cam.lng })
      map.fitBounds(bounds, 100)
    }

    // Sort by geographic angle from centroid to minimize line crossings
    const centroidLat = newCams.reduce((s, c) => s + c.lat, 0) / newCams.length
    const centroidLng = newCams.reduce((s, c) => s + c.lng, 0) / newCams.length
    const sorted = [...newCams].sort((a, b) => {
      const angleA = Math.atan2(a.lat - centroidLat, a.lng - centroidLng)
      const angleB = Math.atan2(b.lat - centroidLat, b.lng - centroidLng)
      return angleA - angleB
    })

    // Polygon layout with sorted order
    const cardHeight = cardWidthPx * 0.6
    const n = sorted.length
    const cardDiagonal = Math.sqrt(cardWidthPx * cardWidthPx + cardHeight * cardHeight)
    const radius = Math.max(cardWidthPx, (n * cardDiagonal * 0.55) / (2 * Math.PI))

    setOffsets((prev) => {
      const next = new Map(prev)
      sorted.forEach((cam, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        next.set(cam.id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        })
      })
      return next
    })
  }, [selectedIds, map, cameras, cardWidthPx])

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    const existing = offsets.get(id) ?? { x: 0, y: 0 }
    setDragging({ id, startX: e.clientX, startY: e.clientY, ox: existing.x, oy: existing.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    e.stopPropagation()
    didDragRef.current = true
    const dx = e.clientX - dragging.startX
    const dy = e.clientY - dragging.startY
    setOffsets((prev) => {
      const next = new Map(prev)
      next.set(dragging.id, { x: dragging.ox + dx, y: dragging.oy + dy })
      return next
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    e.stopPropagation()
    setDragging(null)
    // Reset didDrag after a tick so the click handler can check it
    setTimeout(() => { didDragRef.current = false }, 0)
  }

  const handleMarkerClick = (id: string) => {
    if (didDragRef.current) return
    onToggle(id)
  }

  return (
    <GoogleMap
      defaultCenter={{ lat: 33.0, lng: -80.0 }}
      defaultZoom={8}
      mapId={mapId}
      className="map-container"
    >
      {cameras.map((cam) => {
        const isSelected = selectedIds.has(cam.id)
        const offset = offsets.get(cam.id)
        return (
          <AdvancedMarker
            key={cam.id}
            position={{ lat: cam.lat, lng: cam.lng }}
            onClick={() => handleMarkerClick(cam.id)}
            zIndex={isSelected ? 100 : 1}
          >
            {isSelected ? (
              <div className="map-feed-anchor" onClick={(e) => e.stopPropagation()}>
                <div className="map-pin-active" />
                {offset && (offset.x !== 0 || offset.y !== 0) && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
                    <line x1="8" y1="8" x2={clampToRect(8, 8, offset.x, offset.y, cardWidthPx, cardWidthPx * 0.6).x} y2={clampToRect(8, 8, offset.x, offset.y, cardWidthPx, cardWidthPx * 0.6).y} stroke="var(--color-accent-marker)" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                )}
                <div
                  className="map-feed"
                  style={{ width: `${cardWidthPx}px`, position: 'absolute', left: offset?.x ?? 0, top: offset?.y ?? -cardWidthPx * 0.4 }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  <div className="map-feed-header">
                    <div
                      className="map-feed-drag"
                      onPointerDown={(e) => onPointerDown(e, cam.id)}
                    >
                      <GripVertical size={12} />
                    </div>
                    <span className="map-feed-title">{cam.description}</span>
                    <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); onToggle(cam.id) }}>
                      <X size={12} />
                    </button>
                  </div>
                  {mode === 'video' ? (
                    <video src={cam.video_url} autoPlay muted playsInline controls />
                  ) : (
                    <img src={cam.image_url} alt={cam.description} />
                  )}
                </div>
              </div>
            ) : (
              <div className="map-pin" />
            )}
          </AdvancedMarker>
        )
      })}
    </GoogleMap>
  )
}
