import { directionsClient } from './client';
import type { DirectionsWaypoint, DirectionsRoute, DirectionsOptions, Coordinates } from './types';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';

export class MapboxDirectionsService {
  /**
   * Get route between waypoints
   */
  async getRoute(
    waypoints: DirectionsWaypoint[],
    options: DirectionsOptions = {}
  ): Promise<DirectionsRoute> {
    try {
      if (waypoints.length < 2) {
        throw new AppError(400, 'At least 2 waypoints required');
      }

      const coordinates = waypoints.map((wp) => [wp.coordinates.longitude, wp.coordinates.latitude]);

      const response = await directionsClient
        .getDirections({
          profile: options.profile || 'driving-traffic',
          waypoints: coordinates.map((coord, index) => ({
            coordinates: coord as [number, number],
            ...(waypoints[index]?.name && { waypointName: waypoints[index]?.name }),
          })),
          alternatives: options.alternatives ?? false,
          steps: options.steps ?? true,
          continue_straight: options.continue_straight,
          geometries: options.geometries || 'geojson',
          overview: options.overview || 'full',
          annotations: options.annotations,
        })
        .send();

      const routes = response.body.routes;

      if (!routes || routes.length === 0) {
        throw new AppError(404, 'No route found');
      }

      const route = routes[0];

      if (!route) {
        throw new AppError(404, 'No route found');
      }

      // Validate route has required properties
      if (typeof route.distance !== 'number' || typeof route.duration !== 'number') {
        throw new AppError(500, 'Invalid route data received from Mapbox');
      }

      logger.info('Route calculated', {
        waypoints: waypoints.length,
        distance: route.distance,
        duration: route.duration,
      });

      return route as DirectionsRoute;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Directions request failed', { waypoints, error });
      throw new AppError(500, 'Failed to calculate route');
    }
  }

  /**
   * Calculate route with traffic consideration
   */
  async getRouteWithTraffic(waypoints: DirectionsWaypoint[]): Promise<DirectionsRoute> {
    return this.getRoute(waypoints, {
      profile: 'driving-traffic',
      steps: true,
      annotations: ['duration', 'distance', 'speed'],
    });
  }

  /**
   * Calculate simple point-to-point route
   */
  async getSimpleRoute(origin: Coordinates, destination: Coordinates): Promise<DirectionsRoute> {
    return this.getRoute(
      [
        { coordinates: origin },
        { coordinates: destination },
      ],
      {
        profile: 'driving-traffic',
        steps: false,
        overview: 'simplified',
      }
    );
  }
}

export default new MapboxDirectionsService();
