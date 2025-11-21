/**
 * Zone Templates Service
 *
 * Manages pre-defined zone templates for weekday (2 zones) and weekend (5 zones) patterns.
 * Provides methods for applying templates, checking point-in-polygon, and finding nearest zones.
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';
import type { DeliveryZone } from '@prisma/client';
import type { ZoneTemplate, ZoneDefinition, GeoJSONPoint, GeoJSONPolygon, PointInPolygonResult, NearestZoneResult } from './zones.types';

// =====================================================
// ZONE TEMPLATES
// =====================================================

/**
 * Pre-defined zone templates for different delivery patterns
 */
export const ZONE_TEMPLATES: Record<string, ZoneTemplate> = {
  weekday: {
    name: 'Monday-Thursday (Low Volume)',
    description: '2 zones for standard weekday delivery',
    targetDriverCount: 2,
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday'],
    zones: [
      {
        name: 'North Zone',
        description: 'Northern delivery area for weekday operations',
        color: '#2E5EAA', // Blue
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              // Example polygon for North Zone (replace with actual coordinates)
              [-79.4000, 43.7000],
              [-79.3500, 43.7000],
              [-79.3500, 43.6500],
              [-79.4000, 43.6500],
              [-79.4000, 43.7000], // Close the polygon
            ],
          ],
        },
      },
      {
        name: 'South Zone',
        description: 'Southern delivery area for weekday operations',
        color: '#52C41A', // Green
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              // Example polygon for South Zone (replace with actual coordinates)
              [-79.4000, 43.6500],
              [-79.3500, 43.6500],
              [-79.3500, 43.6000],
              [-79.4000, 43.6000],
              [-79.4000, 43.6500], // Close the polygon
            ],
          ],
        },
      },
    ],
  },

  weekend: {
    name: 'Friday-Saturday (High Volume)',
    description: '5 zones for weekend peak delivery',
    targetDriverCount: 5,
    activeDays: ['friday', 'saturday'],
    zones: [
      {
        name: 'North Central',
        description: 'High-density north central area',
        color: '#2E5EAA', // Blue
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.3900, 43.6800],
              [-79.3700, 43.6800],
              [-79.3700, 43.6600],
              [-79.3900, 43.6600],
              [-79.3900, 43.6800],
            ],
          ],
        },
      },
      {
        name: 'Downtown',
        description: 'High-density downtown core',
        color: '#52C41A', // Green
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.3900, 43.6600],
              [-79.3700, 43.6600],
              [-79.3700, 43.6400],
              [-79.3900, 43.6400],
              [-79.3900, 43.6600],
            ],
          ],
        },
      },
      {
        name: 'East End',
        description: 'Eastern suburban area',
        color: '#FA8C16', // Orange
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.3700, 43.6800],
              [-79.3500, 43.6800],
              [-79.3500, 43.6400],
              [-79.3700, 43.6400],
              [-79.3700, 43.6800],
            ],
          ],
        },
      },
      {
        name: 'West End',
        description: 'Western suburban area',
        color: '#F5222D', // Red
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.4100, 43.6800],
              [-79.3900, 43.6800],
              [-79.3900, 43.6400],
              [-79.4100, 43.6400],
              [-79.4100, 43.6800],
            ],
          ],
        },
      },
      {
        name: 'South Zone',
        description: 'Southern delivery area',
        color: '#722ED1', // Purple
        targetDriverCount: 1,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.4100, 43.6400],
              [-79.3500, 43.6400],
              [-79.3500, 43.6000],
              [-79.4100, 43.6000],
              [-79.4100, 43.6400],
            ],
          ],
        },
      },
    ],
  },
};

// =====================================================
// SERVICE CLASS
// =====================================================

export class ZoneTemplatesService {
  /**
   * Apply a zone template by creating zones in the database
   *
   * @param templateName - Name of the template (weekday or weekend)
   * @param activeDays - Optional override for active days
   * @returns Array of created zones
   */
  async applyTemplate(
    templateName: string,
    activeDays?: string[]
  ): Promise<DeliveryZone[]> {
    const template = ZONE_TEMPLATES[templateName];

    if (!template) {
      throw createAppError(
        400,
        `Template "${templateName}" not found. Available templates: ${Object.keys(ZONE_TEMPLATES).join(', ')}`
      );
    }

    logger.info('Applying zone template', { templateName, zoneCount: template.zones.length });

    try {
      // Create zones from template
      const createdZones: DeliveryZone[] = [];
      let displayOrder = 0;

      for (const zoneDefinition of template.zones) {
        const zone = await prisma.deliveryZone.create({
          data: {
            name: zoneDefinition.name,
            description: zoneDefinition.description ?? template.description,
            color: zoneDefinition.color,
            boundary: zoneDefinition.boundary as any, // GeoJSON stored as JSONB
            activeDays: activeDays ?? template.activeDays,
            isActive: true,
            targetDriverCount: zoneDefinition.targetDriverCount,
            displayOrder: displayOrder++,
          },
        });

        createdZones.push(zone);
      }

      logger.info('Zone template applied successfully', {
        templateName,
        zonesCreated: createdZones.length,
        zoneIds: createdZones.map((z) => z.id),
      });

      return createdZones;
    } catch (error) {
      logger.error('Failed to apply zone template', { templateName, error });
      throw createAppError(500, 'Failed to apply zone template', error);
    }
  }

  /**
   * Get all zones that are active for a specific date
   *
   * @param date - Date to check (checks day of week)
   * @returns Array of active zones for that day
   */
  async getActiveZonesForDate(date: Date): Promise<DeliveryZone[]> {
    const dayOfWeek = this.getDayOfWeek(date);

    logger.debug('Fetching active zones for date', { date, dayOfWeek });

    try {
      const zones = await prisma.deliveryZone.findMany({
        where: {
          isActive: true,
          activeDays: {
            has: dayOfWeek,
          },
        },
        orderBy: {
          displayOrder: 'asc',
        },
      });

      logger.info('Active zones retrieved', { date, dayOfWeek, zoneCount: zones.length });

      return zones;
    } catch (error) {
      logger.error('Failed to fetch active zones', { date, error });
      throw createAppError(500, 'Failed to fetch active zones', error);
    }
  }

  /**
   * Check if a point is inside a polygon using ray-casting algorithm
   *
   * @param point - Point to check (lat, lng)
   * @param boundary - Polygon boundary (GeoJSON)
   * @returns Result with isInside flag
   */
  isPointInZone(point: GeoJSONPoint, boundary: GeoJSONPolygon): boolean {
    const [lng, lat] = point.coordinates;
    const polygon = boundary.coordinates[0]; // Get outer ring

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect =
        yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Find which zone contains a given point
   *
   * @param point - Point to check (lat, lng)
   * @param zones - Array of zones to check against
   * @returns Result with zone ID and name if found
   */
  findZoneForPoint(point: GeoJSONPoint, zones: DeliveryZone[]): PointInPolygonResult {
    for (const zone of zones) {
      const boundary = zone.boundary as unknown as GeoJSONPolygon;

      if (this.isPointInZone(point, boundary)) {
        return {
          isInside: true,
          zoneId: zone.id,
          zoneName: zone.name,
        };
      }
    }

    return { isInside: false };
  }

  /**
   * Find the nearest zone to a point using centroid distance
   *
   * @param point - Point to check (lat, lng)
   * @param zones - Array of zones to check against
   * @returns Nearest zone with distance in kilometers
   */
  findNearestZone(point: GeoJSONPoint, zones: DeliveryZone[]): NearestZoneResult | null {
    if (zones.length === 0) {
      return null;
    }

    let nearestZone: DeliveryZone | null = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const boundary = zone.boundary as unknown as GeoJSONPolygon;
      const centroid = this.calculatePolygonCentroid(boundary);
      const distance = this.calculateDistance(point, centroid);

      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = zone;
      }
    }

    if (!nearestZone) {
      return null;
    }

    return {
      zoneId: nearestZone.id,
      zoneName: nearestZone.name,
      distance: minDistance,
    };
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Get day of week as lowercase string
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Calculate centroid of a polygon
   */
  private calculatePolygonCentroid(polygon: GeoJSONPolygon): GeoJSONPoint {
    const coordinates = polygon.coordinates[0];
    let sumLng = 0;
    let sumLat = 0;
    const count = coordinates.length - 1; // Exclude closing point

    for (let i = 0; i < count; i++) {
      sumLng += coordinates[i][0];
      sumLat += coordinates[i][1];
    }

    return {
      type: 'Point',
      coordinates: [sumLng / count, sumLat / count],
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   *
   * @returns Distance in kilometers
   */
  private calculateDistance(point1: GeoJSONPoint, point2: GeoJSONPoint): number {
    const [lng1, lat1] = point1.coordinates;
    const [lng2, lat2] = point2.coordinates;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new ZoneTemplatesService();
