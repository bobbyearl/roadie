export interface Camera {
  id: string
  name: string
  description: string
  route: string
  direction: string
  jurisdiction: string
  lat: number
  lng: number
  image_url: string
  video_url: string
  active: boolean
}

export interface StateConfig {
  id: string
  name: string
  dataFile: string
  parser: (data: unknown) => Camera[]
  defaultCenter: { lat: number; lng: number }
  defaultZoom: number
  supportsVideo: boolean
  cameraCount: number
}

export interface CameraGeoJSON {
  features: Array<{
    type: 'Feature'
    geometry: { coordinates: [number, number]; type: 'Point' }
    properties: {
      id: string
      name: string
      description: string
      route: string
      direction: string
      jurisdiction: string
      image_url: string
      https_url: string
      active: boolean
    }
  }>
}

function parseSC(data: unknown): Camera[] {
  const geojson = data as CameraGeoJSON
  return geojson.features
    .filter((f) => f.properties.active)
    .map((f) => ({
      id: f.properties.id,
      name: f.properties.name,
      description: f.properties.description,
      route: f.properties.route,
      direction: f.properties.direction,
      jurisdiction: f.properties.jurisdiction,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      image_url: f.properties.image_url,
      video_url: f.properties.https_url,
      active: f.properties.active,
    }))
}

function parseNormalized(data: unknown): Camera[] {
  return (data as Camera[]).filter((c) => c.active)
}

export const STATES: StateConfig[] = [
  {
    id: 'sc',
    name: 'South Carolina',
    dataFile: 'data/cameras.geojson',
    parser: parseSC,
    defaultCenter: { lat: 33.8, lng: -80.9 },
    defaultZoom: 8,
    supportsVideo: true,
    cameraCount: 760,
  },
  {
    id: 'nc',
    name: 'North Carolina',
    dataFile: 'data/nc.json',
    parser: parseNormalized,
    defaultCenter: { lat: 35.5, lng: -79.8 },
    defaultZoom: 7,
    supportsVideo: false,
    cameraCount: 1112,
  },
  {
    id: 'va',
    name: 'Virginia',
    dataFile: 'data/va.geojson',
    parser: parseSC,
    defaultCenter: { lat: 37.5, lng: -78.8 },
    defaultZoom: 7,
    supportsVideo: true,
    cameraCount: 1692,
  },
  {
    id: 'ga',
    name: 'Georgia',
    dataFile: 'data/ga.json',
    parser: parseNormalized,
    defaultCenter: { lat: 33.7, lng: -84.4 },
    defaultZoom: 8,
    supportsVideo: false,
    cameraCount: 4043,
  },
]

export function getStateConfig(stateId: string): StateConfig {
  return STATES.find((s) => s.id === stateId) ?? STATES[0]
}
