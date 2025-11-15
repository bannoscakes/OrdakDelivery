import { matrixClient } from './client';
import type { MatrixLocation, MatrixResult, Coordinates } from './types';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';

export class MapboxMatrixService {
  /**
   * Calculate distance/duration matrix between locations
   */
  async calculateMatrix(
    locations: MatrixLocation[],
    options: {
      sources?: number[]; // Indices of locations to use as sources
      destinations?: number[]; // Indices of locations to use as destinations
      profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
    } = {}
  ): Promise<MatrixResult> {
    try {
      if (locations.length < 2) {
        throw new AppError(400, 'At least 2 locations required for matrix calculation');
      }

      // Mapbox Matrix API has a limit of 25 locations
      if (locations.length > 25) {
        throw new AppError(400, 'Maximum 25 locations allowed for matrix calculation');
      }

      const coordinates = locations.map((loc) => [loc.coordinates.longitude, loc.coordinates.latitude]);

      const response = await matrixClient
        .getMatrix({
          points: coordinates.map((coord) => ({ coordinates: coord as [number, number] })),
          profile: options.profile || 'driving-traffic',
          sources: options.sources,
          destinations: options.destinations,
        })
        .send();

      const { distances, durations } = response.body;

      if (!distances || !durations) {
        throw new AppError(500, 'Invalid matrix response from Mapbox');
      }

      const result: MatrixResult = {
        distances: distances as number[][],
        durations: durations as number[][],
        sources: locations,
        destinations: locations,
      };

      logger.info('Matrix calculated', {
        locations: locations.length,
        sources: options.sources?.length || locations.length,
        destinations: options.destinations?.length || locations.length,
      });

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Matrix calculation failed', { locations: locations.length, error });
      throw new AppError(500, 'Failed to calculate distance matrix');
    }
  }

  /**
   * Calculate one-to-many distances (useful for finding nearest location)
   */
  async calculateOneToMany(
    origin: Coordinates,
    destinations: Coordinates[],
    profile: 'driving' | 'driving-traffic' = 'driving-traffic'
  ): Promise<{ distances: number[]; durations: number[] }> {
    const locations: MatrixLocation[] = [
      { coordinates: origin },
      ...destinations.map((coord) => ({ coordinates: coord })),
    ];

    const result = await this.calculateMatrix(locations, {
      sources: [0], // Only the origin
      destinations: destinations.map((_, index) => index + 1), // All destinations
      profile,
    });

    // Extract the first row (origin to all destinations)
    const distances = result.distances[0];
    const durations = result.durations[0];

    if (!distances || !durations) {
      throw new AppError(500, 'Invalid matrix result');
    }

    return { distances, durations };
  }
}

export default new MapboxMatrixService();
