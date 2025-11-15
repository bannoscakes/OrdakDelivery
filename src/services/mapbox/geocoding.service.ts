import { geocodingClient } from './client';
import type { GeocodingResult, Coordinates } from './types';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';

export class MapboxGeocodingService {
  /**
   * Forward geocode: convert address to coordinates
   */
  async forward(address: string, options?: { country?: string }): Promise<GeocodingResult> {
    try {
      const response = await geocodingClient
        .forwardGeocode({
          query: address,
          limit: 1,
          ...(options?.country && { countries: [options.country] }),
        })
        .send();

      const features = response.body.features;

      if (!features || features.length === 0) {
        throw new AppError(404, `No geocoding results found for address: ${address}`);
      }

      const feature = features[0];

      if (!feature) {
        throw new AppError(404, `No geocoding results found for address: ${address}`);
      }

      // Extract context information
      const context: GeocodingResult['context'] = {};
      if (feature.context) {
        for (const ctx of feature.context) {
          if (!ctx.id) continue;

          if (ctx.id.startsWith('region')) {
            context.region = ctx.text;
          } else if (ctx.id.startsWith('postcode')) {
            context.postcode = ctx.text;
          } else if (ctx.id.startsWith('place')) {
            context.place = ctx.text;
          } else if (ctx.id.startsWith('country')) {
            context.country = ctx.text;
          }
        }
      }

      // Validate coordinates before type assertion
      const longitude = feature.center[0];
      const latitude = feature.center[1];

      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new AppError(500, 'Invalid coordinates received from geocoding service');
      }

      const result: GeocodingResult = {
        coordinates: {
          longitude,
          latitude,
        },
        formattedAddress: feature.place_name,
        confidence: feature.relevance,
        placeType: feature.place_type,
        context,
      };

      logger.info('Geocoding successful', { address, result: result.formattedAddress });

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Geocoding failed', { address, error });
      throw new AppError(500, 'Failed to geocode address');
    }
  }

  /**
   * Reverse geocode: convert coordinates to address
   */
  async reverse(coordinates: Coordinates): Promise<GeocodingResult> {
    try {
      const response = await geocodingClient
        .reverseGeocode({
          query: [coordinates.longitude, coordinates.latitude],
          limit: 1,
        })
        .send();

      const features = response.body.features;

      if (!features || features.length === 0) {
        throw new AppError(404, 'No reverse geocoding results found');
      }

      const feature = features[0];

      if (!feature) {
        throw new AppError(404, 'No reverse geocoding results found');
      }

      // Extract context information
      const context: GeocodingResult['context'] = {};
      if (feature.context) {
        for (const ctx of feature.context) {
          if (!ctx.id) continue;

          if (ctx.id.startsWith('region')) {
            context.region = ctx.text;
          } else if (ctx.id.startsWith('postcode')) {
            context.postcode = ctx.text;
          } else if (ctx.id.startsWith('place')) {
            context.place = ctx.text;
          } else if (ctx.id.startsWith('country')) {
            context.country = ctx.text;
          }
        }
      }

      // Validate coordinates before type assertion
      const longitude = feature.center[0];
      const latitude = feature.center[1];

      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        throw new AppError(500, 'Invalid coordinates received from geocoding service');
      }

      const result: GeocodingResult = {
        coordinates: {
          longitude,
          latitude,
        },
        formattedAddress: feature.place_name,
        confidence: feature.relevance,
        placeType: feature.place_type,
        context,
      };

      logger.info('Reverse geocoding successful', { coordinates, result: result.formattedAddress });

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Reverse geocoding failed', { coordinates, error });
      throw new AppError(500, 'Failed to reverse geocode coordinates');
    }
  }
}

export default new MapboxGeocodingService();
