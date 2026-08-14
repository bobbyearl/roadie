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
  hasVideo: boolean;
}

export interface StateConfig {
  id: string;
  name: string;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  supportsVideo: boolean;
  cameraCount: number;
  offline?: boolean;
}

// Raw database format from cameras.db.json
export interface CameraDB {
  states: string[];
  jurisdictions: string[];
  routes: string[];
  cameras: Array<[number, number, string, number, string, number, number, string, string, number]>;
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
      hasVideo: c[9] === 1,
    }));
}

export { parseCameraDB };

export const STATES: StateConfig[] = [
  {
    id: 'al',
    name: 'Alabama',
    defaultCenter: { lat: 32.8, lng: -86.8 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 630,
  },
  {
    id: 'ca',
    name: 'California',
    defaultCenter: { lat: 36.7, lng: -119.8 },
    defaultZoom: 6,
    supportsVideo: false,
    cameraCount: 3519,
  },
  {
    id: 'ct',
    name: 'Connecticut',
    defaultCenter: { lat: 41.6, lng: -72.7 },
    defaultZoom: 9,
    supportsVideo: false,
    cameraCount: 347,
  },
  {
    id: 'de',
    name: 'Delaware',
    defaultCenter: { lat: 39.0, lng: -75.5 },
    defaultZoom: 9,
    supportsVideo: true,
    cameraCount: 351,
  },
  {
    id: 'fl',
    name: 'Florida',
    defaultCenter: { lat: 28.0, lng: -82.0 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 4881,
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
    id: 'nj',
    name: 'New Jersey',
    defaultCenter: { lat: 40.2, lng: -74.7 },
    defaultZoom: 8,
    supportsVideo: false,
    cameraCount: 484,
    offline: true,
  },
  {
    id: 'pa',
    name: 'Pennsylvania',
    defaultCenter: { lat: 40.9, lng: -77.8 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 1410,
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
    id: 'tn',
    name: 'Tennessee',
    defaultCenter: { lat: 35.8, lng: -86.0 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 667,
  },
  {
    id: 'ut',
    name: 'Utah',
    defaultCenter: { lat: 40.5, lng: -111.9 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 2068,
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
  defaultCenter: { lat: 37.5, lng: -96.0 },
  defaultZoom: 5,
  supportsVideo: true,
  cameraCount: STATES.reduce((sum, s) => sum + s.cameraCount, 0),
};

export function getStateConfig(stateId: string): StateConfig {
  if (stateId === 'all') {
    return ALL_STATES_CONFIG;
  }
  return STATES.find((s) => s.id === stateId) ?? STATES[0];
}
