/**
 * Type definitions for Zone-Based Dispatch System
 */

export interface ZoneTemplate {
  name: string;
  description: string;
  zones: ZoneDefinition[];
  targetDriverCount: number;
  activeDays: string[];
}

export interface ZoneDefinition {
  name: string;
  description?: string;
  boundary: GeoJSONPolygon;
  color: string;
  targetDriverCount: number;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface PointInPolygonResult {
  isInside: boolean;
  zoneId?: string;
  zoneName?: string;
}

export interface NearestZoneResult {
  zoneId: string;
  zoneName: string;
  distance: number; // kilometers
}

export interface ZoneAssignmentResult {
  totalOrders: number;
  assignedOrders: number;
  outOfBoundsOrders: number;
  assignmentsByZone: {
    zoneId: string;
    zoneName: string;
    orderCount: number;
    orderIds: string[];
  }[];
}
