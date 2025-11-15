import geocodingService from '@/modules/geocoding/geocoding.service';
import logger from '@config/logger';

/**
 * Geocode an address and convert to WKT Point format for PostGIS
 * @param address - Full address string
 * @param country - Country code for geocoding (optional)
 * @returns Object with locationWKT and geocoded flag
 */
export const geocodeAddressToWKT = async (
  address: string,
  country?: string
): Promise<{ locationWKT?: string; geocoded: boolean }> => {
  try {
    const geocodeResult = await geocodingService.geocodeAddress(address, {
      ...(country && { country }),
    });

    // Create WKT Point for PostGIS
    // Format: POINT(longitude latitude)
    const locationWKT = `POINT(${geocodeResult.coordinates.longitude} ${geocodeResult.coordinates.latitude})`;

    logger.info('Address geocoded', {
      address,
      coordinates: geocodeResult.coordinates,
    });

    return { locationWKT, geocoded: true };
  } catch (error) {
    logger.warn('Failed to geocode address', { address, error });
    return { geocoded: false };
  }
};
