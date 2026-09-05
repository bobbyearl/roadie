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

// Build a pre-filled GitHub issue URL for reporting a broken/intermittent camera.
// Targets the broken-camera issue FORM (.github/ISSUE_TEMPLATE/broken-camera.yml)
// and prefills its fields by id (camera-id, camera-name) so the user only picks a
// symptom and submits. The form applies the broken-camera label, which the verify
// bot filters on; passing labels= too is harmless belt-and-suspenders.
export function reportCameraUrl(camera: Camera): string {
  const params = new URLSearchParams({
    template: 'broken-camera.yml',
    labels: 'broken-camera',
    title: `Broken camera: ${camera.id}`,
    'camera-id': camera.id,
    'camera-name': camera.name || camera.description || '',
  });
  return `https://github.com/bobbyearl/roadie/issues/new?${params.toString()}`;
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
    id: 'ak',
    name: 'Alaska',
    defaultCenter: { lat: 62.0, lng: -150.0 },
    defaultZoom: 5,
    supportsVideo: false,
    cameraCount: 126,
  },
  {
    id: 'al',
    name: 'Alabama',
    defaultCenter: { lat: 32.8, lng: -86.8 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 630,
  },
  {
    id: 'ar',
    name: 'Arkansas',
    defaultCenter: { lat: 34.8, lng: -92.4 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 552,
  },
  {
    id: 'az',
    name: 'Arizona',
    defaultCenter: { lat: 34.2, lng: -111.7 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 644,
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
    id: 'ia',
    name: 'Iowa',
    defaultCenter: { lat: 42.0, lng: -93.5 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 853,
  },
  {
    id: 'id',
    name: 'Idaho',
    defaultCenter: { lat: 44.0, lng: -114.7 },
    defaultZoom: 6,
    supportsVideo: false,
    cameraCount: 457,
  },
  {
    id: 'il',
    name: 'Illinois',
    defaultCenter: { lat: 40.0, lng: -89.2 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 1372,
  },
  {
    id: 'ks',
    name: 'Kansas',
    defaultCenter: { lat: 38.5, lng: -98.3 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 521,
  },
  {
    id: 'ky',
    name: 'Kentucky',
    defaultCenter: { lat: 37.6, lng: -85.3 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 254,
  },
  {
    id: 'la',
    name: 'Louisiana',
    defaultCenter: { lat: 30.5, lng: -91.9 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 251,
  },
  {
    id: 'ma',
    name: 'Massachusetts',
    defaultCenter: { lat: 42.2, lng: -71.5 },
    defaultZoom: 8,
    supportsVideo: false,
    cameraCount: 306,
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
    id: 'mi',
    name: 'Michigan',
    defaultCenter: { lat: 44.3, lng: -85.6 },
    defaultZoom: 6,
    supportsVideo: false,
    cameraCount: 804,
  },
  {
    id: 'mn',
    name: 'Minnesota',
    defaultCenter: { lat: 46.0, lng: -94.3 },
    defaultZoom: 6,
    supportsVideo: false,
    cameraCount: 1524,
  },
  {
    id: 'mt',
    name: 'Montana',
    defaultCenter: { lat: 46.9, lng: -110.4 },
    defaultZoom: 6,
    supportsVideo: false,
    cameraCount: 38,
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
    id: 'nd',
    name: 'North Dakota',
    defaultCenter: { lat: 47.5, lng: -100.5 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 809,
  },
  {
    id: 'ne',
    name: 'New England (ME/VT)',
    defaultCenter: { lat: 44.5, lng: -69.5 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 403,
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
    id: 'nv',
    name: 'Nevada',
    defaultCenter: { lat: 39.5, lng: -116.9 },
    defaultZoom: 6,
    supportsVideo: true,
    cameraCount: 640,
  },
  {
    id: 'ny',
    name: 'New York',
    defaultCenter: { lat: 42.5, lng: -75.5 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 2979,
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
    id: 'sd',
    name: 'South Dakota',
    defaultCenter: { lat: 44.4, lng: -100.2 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 156,
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
  {
    id: 'wa',
    name: 'Washington',
    defaultCenter: { lat: 47.4, lng: -120.5 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 1705,
  },
  {
    id: 'wi',
    name: 'Wisconsin',
    defaultCenter: { lat: 43.8, lng: -89.4 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 455,
  },
];

export const ALL_STATES_CONFIG: StateConfig = {
  id: 'all',
  name: 'All States',
  defaultCenter: { lat: 39.0, lng: -98.0 },
  defaultZoom: 4,
  supportsVideo: true,
  cameraCount: STATES.reduce((sum, s) => sum + s.cameraCount, 0),
};

export function getStateConfig(stateId: string): StateConfig {
  if (stateId === 'all') {
    return ALL_STATES_CONFIG;
  }
  return STATES.find((s) => s.id === stateId) ?? STATES[0];
}
