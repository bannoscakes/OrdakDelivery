import env from '@config/env';
import logger from '@config/logger';
import { AppError, createAppError } from '@/middleware/errorHandler';
import type {
  OptimizationRequest,
  OptimizationSolution,
  OptimizationVehicle,
  OptimizationService,
} from './types';
import { MAPBOX_OPTIMIZATION_BASE_URL } from './client';

export class MapboxOptimizationService {
  /**
   * Submit optimization job to Mapbox Optimization API v2
   *
   * NOTE: Mapbox API authentication requires access_token in URL query parameter.
   * This is Mapbox's standard authentication method - they do not support header-based auth.
   * Security considerations:
   * - Tokens may appear in server access logs
   * - Mitigation: Ensure web server logging is configured to redact query parameters
   * - Mitigation: Use HTTPS for all requests (token encrypted in transit)
   * - Mitigation: Rotate tokens periodically and use environment-specific tokens
   */
  async optimize(request: OptimizationRequest): Promise<OptimizationSolution> {
    try {
      if (!request.vehicles || request.vehicles.length === 0) {
        throw new AppError(400, 'At least one vehicle required');
      }

      if (!request.services || request.services.length === 0) {
        throw new AppError(400, 'At least one service (stop) required');
      }

      // Mapbox requires access_token as query parameter (no header auth available)
      const url = `${MAPBOX_OPTIMIZATION_BASE_URL}?access_token=${env.MAPBOX_ACCESS_TOKEN}`;

      logger.info('Submitting optimization request', {
        vehicles: request.vehicles.length,
        services: request.services.length,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          options: {
            geometry_format: 'geojson',
            ...request.options,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Optimization request failed', {
          status: response.status,
          error: errorText,
        });
        throw new AppError(response.status, `Optimization failed: ${errorText}`);
      }

      const solution: OptimizationSolution = await response.json();

      logger.info('Optimization completed', {
        code: solution.code,
        routes: solution.routes.length,
        unassigned: solution.unassigned.length,
        distance: solution.summary.distance,
        duration: solution.summary.duration,
      });

      return solution;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Optimization service error', error);
      throw createAppError(500, 'Failed to optimize route', error);
    }
  }

  /**
   * Create optimization request from simplified input
   * Includes vehicle capacity constraints and order service durations
   */
  buildOptimizationRequest(params: {
    vehicleStartLocation: [number, number];
    vehicleEndLocation?: [number, number];
    stops: Array<{
      id: string;
      location: [number, number];
      serviceDuration?: number; // seconds
      timeWindow?: [number, number]; // Unix timestamps
      priority?: number;
      weightKg?: number; // order weight in kg
      packageCount?: number; // number of packages
    }>;
    vehicleCapacityKg?: number; // vehicle capacity in kg
  }): OptimizationRequest {
    // Build vehicle with capacity constraints
    const vehicle: OptimizationVehicle = {
      vehicle_id: 'vehicle_1',
      start_location: params.vehicleStartLocation,
      ...(params.vehicleEndLocation && { end_location: params.vehicleEndLocation }),
      // Mapbox uses capacity as array [dimension1, dimension2, ...]
      // We use single dimension for weight in kg
      ...(params.vehicleCapacityKg && { capacity: [params.vehicleCapacityKg] }),
    };

    // Build services with delivery sizes (for capacity constraints)
    const services: OptimizationService[] = params.stops.map((stop) => ({
      id: stop.id,
      location: stop.location,
      // Service duration - time spent at each stop
      service_duration: stop.serviceDuration || 300, // default 5 minutes
      // Delivery size - capacity consumed by this order
      ...(stop.weightKg && { delivery: [stop.weightKg] }),
      // Time windows if specified
      ...(stop.timeWindow && { time_windows: [stop.timeWindow] }),
      // Priority if specified
      ...(stop.priority && { priority: stop.priority }),
    }));

    return {
      vehicles: [vehicle],
      services,
      options: {
        geometry_format: 'geojson',
      },
    };
  }
}

export default new MapboxOptimizationService();
