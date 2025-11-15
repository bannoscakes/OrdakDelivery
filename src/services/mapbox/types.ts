// Common Mapbox types

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface BoundingBox {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
}

// Geocoding types
export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  confidence: number;
  placeType: string[];
  context?: {
    region?: string;
    postcode?: string;
    place?: string;
    country?: string;
  };
}

// Directions types
export type DirectionsProfile = 'driving' | 'driving-traffic' | 'walking' | 'cycling';

export interface DirectionsWaypoint {
  coordinates: Coordinates;
  name?: string;
}

export interface DirectionsOptions {
  profile?: DirectionsProfile;
  alternatives?: boolean;
  steps?: boolean;
  continue_straight?: boolean;
  waypoint_names?: string[];
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  overview?: 'full' | 'simplified' | 'false';
  annotations?: string[];
}

export interface DirectionsRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  legs: DirectionsLeg[];
  weight?: number;
  weight_name?: string;
}

export interface DirectionsLeg {
  distance: number;
  duration: number;
  steps?: DirectionsStep[];
}

export interface DirectionsStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  mode: string;
  maneuver: {
    type: string;
    instruction: string;
    location: [number, number];
  };
}

// Matrix types
export interface MatrixLocation {
  coordinates: Coordinates;
  name?: string;
}

export interface MatrixResult {
  distances: number[][]; // meters
  durations: number[][]; // seconds
  sources: MatrixLocation[];
  destinations: MatrixLocation[];
}

// Isochrone types
export type IsochroneProfile = 'driving' | 'walking' | 'cycling';

export interface IsochroneOptions {
  profile: IsochroneProfile;
  contours_minutes?: number[];
  contours_meters?: number[];
  contours_colors?: string[];
  polygons?: boolean;
  denoise?: number;
  generalize?: number;
}

export interface IsochroneFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    contour: number;
    color?: string;
  };
}

// Map Matching types
export interface MapMatchingCoordinate {
  coordinates: Coordinates;
  timestamp?: number;
}

export interface MapMatchingResult {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  confidence: number;
  matchings: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
    confidence: number;
  }>;
}

// Optimization API v2 types
export interface OptimizationVehicle {
  vehicle_id: string;
  start_location: [number, number]; // [lon, lat]
  end_location?: [number, number];
  capacity?: number[];
  earliest_start?: number; // Unix timestamp
  latest_end?: number; // Unix timestamp
  skills?: string[];
  speed_factor?: number;
}

export interface OptimizationService {
  id: string;
  location: [number, number]; // [lon, lat]
  service_duration?: number; // seconds
  time_windows?: Array<[number, number]>; // Unix timestamps
  priority?: number;
  required_skills?: string[];
  delivery?: number[];
  pickup?: number[];
}

export interface OptimizationRequest {
  vehicles: OptimizationVehicle[];
  services: OptimizationService[];
  options?: {
    geometry_format?: 'geojson' | 'polyline' | 'polyline6';
  };
}

export interface OptimizationSolution {
  code: string;
  summary: {
    cost: number;
    duration: number;
    distance: number;
    service: number;
    waiting_time: number;
    violations: number[];
  };
  unassigned: Array<{
    id: string;
    reason: string;
  }>;
  routes: Array<{
    vehicle_id: string;
    geometry: string | GeoJSON.LineString;
    distance: number;
    duration: number;
    service: number;
    waiting_time: number;
    steps: Array<{
      type: 'start' | 'service' | 'end';
      id?: string;
      location: [number, number];
      arrival: number;
      duration: number;
      distance: number;
      load?: number[];
    }>;
  }>;
}
