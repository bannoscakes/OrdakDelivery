import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { geocodingService as mapboxGeocodingService } from '@/services/mapbox';
import type { Coordinates } from '@/services/mapbox';
import { GeocodingProvider } from '@prisma/client';

interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
  cached: boolean;
}

export class GeocodingService {
  /**
   * Geocode an address with cache support
   */
  async geocodeAddress(
    address: string,
    options?: { country?: string; skipCache?: boolean }
  ): Promise<GeocodeResult> {
    try {
      // Normalize address for cache lookup
      const normalizedAddress = address.trim().toLowerCase();

      // Check cache first (unless skipCache is true)
      if (!options?.skipCache) {
        const cached = await prisma.geocodingCache.findUnique({
          where: { address: normalizedAddress },
        });

        if (cached) {
          logger.info('Geocoding cache hit', { address });
          return {
            coordinates: {
              latitude: cached.latitude,
              longitude: cached.longitude,
            },
            formattedAddress: cached.formattedAddress,
            cached: true,
          };
        }
      }

      // Cache miss - call Mapbox
      logger.info('Geocoding cache miss, calling Mapbox', { address });

      const result = await mapboxGeocodingService.forward(address, {
        country: options?.country,
      });

      // Store in cache
      await prisma.geocodingCache.create({
        data: {
          address: normalizedAddress,
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude,
          formattedAddress: result.formattedAddress,
          provider: GeocodingProvider.MAPBOX,
          confidence: result.confidence,
        },
      });

      logger.info('Geocoding result cached', { address, formattedAddress: result.formattedAddress });

      return {
        coordinates: result.coordinates,
        formattedAddress: result.formattedAddress,
        cached: false,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Geocoding failed', { address, error });
      throw new AppError(500, 'Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates
   */
  async reverseGeocode(coordinates: Coordinates): Promise<{ address: string }> {
    try {
      const result = await mapboxGeocodingService.reverse(coordinates);

      return {
        address: result.formattedAddress,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Reverse geocoding failed', { coordinates, error });
      throw new AppError(500, 'Failed to reverse geocode coordinates');
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(
    addresses: string[],
    options?: { country?: string }
  ): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();

    // Process sequentially to avoid rate limiting
    // In production, consider implementing a queue system
    for (const address of addresses) {
      try {
        const result = await this.geocodeAddress(address, options);
        results.set(address, result);
      } catch (error) {
        logger.error('Failed to geocode address in batch', { address, error });
        // Continue with other addresses
      }
    }

    return results;
  }

  /**
   * Clear geocoding cache for an address
   */
  async clearCache(address: string): Promise<void> {
    const normalizedAddress = address.trim().toLowerCase();

    await prisma.geocodingCache.delete({
      where: { address: normalizedAddress },
    });

    logger.info('Geocoding cache cleared', { address });
  }
}

export default new GeocodingService();
