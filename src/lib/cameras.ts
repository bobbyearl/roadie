export interface Camera {
  id: string;
  name: string;
  description: string;
  route: string;
  direction: string;
  jurisdiction: string;
  lat: number;
  lng: number;
  image_url: string;
  video_url: string;
  active: boolean;
}

export interface StateConfig {
  id: string;
  name: string;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  supportsVideo: boolean;
  cameraCount: number;
}

// Raw database format from cameras.db.json
export interface CameraDB {
  states: string[];
  jurisdictions: string[];
  routes: string[];
  cameras: Array<[number, number, string, number, string, number, number, string, string]>;
}

function parseCameraDB(db: CameraDB, filterState?: string): Camera[] {
  return db.cameras
    .filter((c) => filterState === undefined || db.states[c[3]] === filterState)
    .map((c) => ({
      id: filterState ? c[2] : `${db.states[c[3]]}:${c[2]}`,
      name: c[4],
      description: `${c[4]} (${db.jurisdictions[c[6]]})`,
      route: db.routes[c[5]],
      direction: '',
      jurisdiction: db.jurisdictions[c[6]],
      lat: c[0],
      lng: c[1],
      image_url: c[7],
      video_url: c[8],
      active: true,
    }));
}

export { parseCameraDB };

export const STATES: StateConfig[] = [
  {
    id: 'de',
    name: 'Delaware',
    defaultCenter: { lat: 39.0, lng: -75.5 },
    defaultZoom: 9,
    supportsVideo: true,
    cameraCount: 351,
  },
  {
    id: 'ga',
    name: 'Georgia',
    defaultCenter: { lat: 33.7, lng: -84.4 },
    defaultZoom: 8,
    supportsVideo: false,
    cameraCount: 4043,
  },
  {
    id: 'md',
    name: 'Maryland',
    defaultCenter: { lat: 39.3, lng: -76.6 },
    defaultZoom: 8,
    supportsVideo: true,
    cameraCount: 549,
  },
  {
    id: 'nc',
    name: 'North Carolina',
    defaultCenter: { lat: 35.5, lng: -79.8 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 1112,
  },
  {
    id: 'sc',
    name: 'South Carolina',
    defaultCenter: { lat: 33.8, lng: -80.9 },
    defaultZoom: 8,
    supportsVideo: true,
    cameraCount: 760,
  },
  {
    id: 'va',
    name: 'Virginia',
    defaultCenter: { lat: 37.5, lng: -78.8 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 1692,
  },
];

export const ALL_STATES_CONFIG: StateConfig = {
  id: 'all',
  name: 'All States',
  defaultCenter: { lat: 36.5, lng: -79.0 },
  defaultZoom: 6,
  supportsVideo: true,
  cameraCount: STATES.reduce((sum, s) => sum + s.cameraCount, 0),
};

export function getStateConfig(stateId: string): StateConfig {
  if (stateId === 'all') {
    return ALL_STATES_CONFIG;
  }
  return STATES.find((s) => s.id === stateId) ?? STATES[0];
}
