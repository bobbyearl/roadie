import './Sidebar.css';

import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { type Camera, STATES } from '../lib/cameras';
import { CURATED_ROUTES } from '../lib/routes';
import { useTraffic } from '../lib/TrafficContext';

export function Sidebar({ open }: { open?: boolean }) {
  const { stateId, cameras, selectedIds, toggleCamera, selectRoute } = useTraffic();
  const [searchText, setSearchText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(stateId !== 'all' ? [stateId] : []));

  // Auto-expand the current state when it changes via selector
  useEffect(() => {
    if (stateId !== 'all') {
      setExpandedSections((prev) => {
        if (prev.has(stateId)) return prev;
        return new Set([...prev, stateId]);
      });
    }
  }, [stateId]);

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    if (next.has(key)) { next.delete(key); } else { next.add(key); }
    setExpandedSections(next);
  };

  // Group cameras by state, then by route/jurisdiction within state
  const stateGroups = useMemo(() => {
    const groups = new Map<string, Map<string, Camera[]>>();
    for (const cam of cameras) {
      const sid = cam.id.split(':')[0];
      if (!groups.has(sid)) { groups.set(sid, new Map()); }
      const routeMap = groups.get(sid)!;
      const groupKey = cam.route || cam.jurisdiction || 'Other';
      if (!routeMap.has(groupKey)) { routeMap.set(groupKey, []); }
      routeMap.get(groupKey)!.push(cam);
    }
    return groups;
  }, [cameras]);

  // Filter by search
  const filteredStateGroups = useMemo(() => {
    if (!searchText) return stateGroups;
    const filtered = new Map<string, Map<string, Camera[]>>();
    for (const [sid, routeMap] of stateGroups) {
      const filteredRoutes = new Map<string, Camera[]>();
      for (const [route, cams] of routeMap) {
        const matches = cams.filter((c) => c.description.toLowerCase().includes(searchText.toLowerCase()) || c.name.toLowerCase().includes(searchText.toLowerCase()));
        if (matches.length > 0) { filteredRoutes.set(route, matches); }
      }
      if (filteredRoutes.size > 0) { filtered.set(sid, filteredRoutes); }
    }
    return filtered;
  }, [stateGroups, searchText]);

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
        {STATES.map((state) => {
          const routeMap = filteredStateGroups.get(state.id);
          if (!routeMap || routeMap.size === 0) return null;
          const totalCams = [...routeMap.values()].reduce((sum, cams) => sum + cams.length, 0);
          const stateExpanded = isExpanded(state.id);
          const hasCurated = state.id === 'sc';

          return (
            <div key={state.id} className="region-section">
              <button className="region-header" onClick={() => toggleSection(state.id)}>
                {stateExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="region-label">{state.name}</span>
                <span className="region-counter">{totalCams}</span>
              </button>
              {stateExpanded && (
                <div className="region-cameras">
                  {hasCurated && !searchText && (
                    <div className="region-section region-nested">
                      <button className="region-header" onClick={() => toggleSection(`${state.id}:__curated__`)}>
                        {isExpanded(`${state.id}:__curated__`) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="region-label">Curated Routes</span>
                        <span className="region-counter">{CURATED_ROUTES.length}</span>
                      </button>
                      {isExpanded(`${state.id}:__curated__`) && (
                        <div className="region-cameras">
                          {CURATED_ROUTES.map((route) => {
                            const routeIds = route.ids.map((id) => `sc:${id}`);
                            const isActive = routeIds.every((id) => selectedIds.has(id));
                            return (
                              <label key={route.name} className="camera-row">
                                <input type="checkbox" checked={isActive} onChange={() => selectRoute(isActive ? [] : routeIds)} />
                                <span className="camera-row-label">{route.name}</span>
                                <span className="region-counter">{route.ids.length}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {[...routeMap.entries()]
                    .sort((a, b) => b[1].length - a[1].length)
                    .slice(0, 30)
                    .map(([routeName, cams]) => {
                      const routeKey = `${state.id}:${routeName}`;
                      const routeExpanded = isExpanded(routeKey);
                      const selectedInRoute = cams.filter((c) => selectedIds.has(c.id)).length;
                      return (
                        <div key={routeKey} className="region-section region-nested">
                          <button className="region-header" onClick={() => toggleSection(routeKey)}>
                            {routeExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span className="region-label">{routeName}</span>
                            <span className="region-counter">{selectedInRoute > 0 ? `${selectedInRoute}/` : ''}{cams.length}</span>
                          </button>
                          {routeExpanded && (
                            <div className="region-cameras">
                              {cams.map((cam) => (
                                <label key={cam.id} className="camera-row">
                                  <input type="checkbox" checked={selectedIds.has(cam.id)} onChange={() => toggleCamera(cam.id)} />
                                  <span className="camera-row-label">{cam.name || cam.description}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}

        <a
          className="route-request"
          href="https://github.com/bobbyearl/roadie/issues/new?title=Route+request&labels=route-request"
          target="_blank"
          rel="noopener"
        >
          Request Route
        </a>
      </div>
    </aside>
  );
}
