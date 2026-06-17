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

export function parseCameras(geojson: CameraGeoJSON): Camera[] {
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
