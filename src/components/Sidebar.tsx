import { useState } from 'react'
import { type Camera, getStateConfig } from '../lib/cameras'
import { CURATED_ROUTES } from '../lib/routes'
import { useTraffic } from '../lib/TrafficContext'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import './Sidebar.css'

export function Sidebar() {
  const { stateId, cameras, selectedIds, sidebarTab, activeRouteName, setTab, toggleCamera, selectRoute } = useTraffic()
  const [searchText, setSearchText] = useState('')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  const toggleRegion = (region: string) => {
    const next = new Set(expandedRegions)
    if (next.has(region)) next.delete(region)
    else next.add(region)
    setExpandedRegions(next)
  }

  const regionGroups = (() => {
    const map = new Map<string, Camera[]>()
    for (const c of cameras) {
      const r = c.jurisdiction.trim()
      if (!map.has(r)) map.set(r, [])
      map.get(r)!.push(c)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  })()

  const filteredRegionGroups = searchText
    ? regionGroups.map(([region, cams]) => [region, cams.filter((c) => c.description.toLowerCase().includes(searchText.toLowerCase()))] as [string, Camera[]]).filter(([, cams]) => cams.length > 0)
    : regionGroups

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${sidebarTab === 'routes' ? 'sidebar-tab-active' : ''}`} onClick={() => setTab(undefined)}>Routes</button>
        <button className={`sidebar-tab ${sidebarTab === 'regions' ? 'sidebar-tab-active' : ''}`} onClick={() => setTab('regions')}>Regions</button>
      </div>

      {sidebarTab === 'routes' && (
        <div className="sidebar-list">
          {stateId === 'sc' ? (
            <>
              {CURATED_ROUTES.map((route) => (
                <button key={route.name} className={`route-item ${activeRouteName === route.name ? 'route-item-active' : ''}`} onClick={() => selectRoute(route.ids)}>
                  <span className="route-item-name">{route.name}</span>
                  <span className="route-item-count">{route.ids.length}</span>
                </button>
              ))}
              <a className="route-request" href="https://github.com/bobbyearl/traffic-beta/issues/new?title=Route+request&labels=route-request" target="_blank" rel="noopener">+ Request a route</a>
            </>
          ) : (
            <div className="route-empty">
              <p className="route-empty-text">No curated routes yet for {getStateConfig(stateId).name}.</p>
              <a className="route-request" href={`https://github.com/bobbyearl/traffic-beta/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`} target="_blank" rel="noopener">+ Request a route for your area</a>
              <p className="route-empty-hint">Tip: Select cameras from Regions, then share the URL as your custom route.</p>
            </div>
          )}
        </div>
      )}

      {sidebarTab === 'regions' && (
        <>
          <div className="sidebar-search">
            <Search size={14} />
            <input type="text" placeholder="Find in this list" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
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
                          <input type="checkbox" checked={selectedIds.has(cam.id)} onChange={() => toggleCamera(cam.id)} />
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
  )
}
