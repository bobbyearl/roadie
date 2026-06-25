import './Sidebar.css';

import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { type Camera } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { useTraffic } from '../lib/TrafficContext';

export function Sidebar({ open }: { open?: boolean }) {
  const { stateId, cameras, selectedIds, toggleCamera, selectRoute } = useTraffic();
  const hasCuratedRoutes = stateId === 'sc';
  const [searchText, setSearchText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(hasCuratedRoutes ? ['__curated__'] : []));
  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    if (next.has(key)) { next.delete(key); } else { next.add(key); }
    setExpandedSections(next);
  };


  const routeGroups = useMemo(() => {
    const map = new Map<string, Camera[]>();
    for (const c of cameras) {
      const r = hasCuratedRoutes ? (c.jurisdiction || 'Other') : ((c as { route?: string }).route || c.jurisdiction || 'Other');
      if (!map.has(r)) { map.set(r, []); }
      map.get(r)!.push(c);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30);
  }, [cameras, hasCuratedRoutes]);

  const filteredRouteGroups = searchText
    ? routeGroups
        .map(([name, cams]) => [name, cams.filter((c) => c.description.toLowerCase().includes(searchText.toLowerCase()))] as [string, Camera[]])
        .filter(([, cams]) => cams.length > 0)
    : routeGroups;

  const isExpanded = (key: string) => expandedSections.has(key);

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-search">
          <Search size={14} />
          <input type="text" placeholder="Search cameras" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
      </div>
      <div className="sidebar-list">
        {hasCuratedRoutes && !searchText && (
          <div className="region-section">
            <button className="region-header" onClick={() => toggleSection('__curated__')}>
              {isExpanded('__curated__') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="region-label">Curated Routes</span>
              <span className="region-counter">{CURATED_ROUTES.length}</span>
            </button>
            {isExpanded('__curated__') && (
              <div className="region-cameras">
                {CURATED_ROUTES.map((route) => {
                  const isActive = route.ids.every((id) => selectedIds.has(id));
                  return (
                    <label key={route.name} className="camera-row">
                      <input type="checkbox" checked={isActive} onChange={() => selectRoute(isActive ? [] : route.ids)} />
                      <span className="camera-row-label">{route.name}</span>
                      <span className="region-counter">{route.ids.length}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredRouteGroups.map(([name, cams]) => {
          const selectedInGroup = cams.filter((c) => selectedIds.has(c.id)).length;
          const expanded = isExpanded(name);
          return (
            <div key={name} className="region-section">
              <button className="region-header" onClick={() => toggleSection(name)}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="region-label">{name}</span>
                <span className="region-counter">{selectedInGroup}/{cams.length}</span>
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
          );
        })}

        <a
          className="route-request"
          href={`https://github.com/bobbyearl/roadie/issues/new?title=Route+request:+${stateId.toUpperCase()}&labels=route-request`}
          target="_blank"
          rel="noopener"
        >
          Request Route
        </a>
      </div>
    </aside>
  );
}
