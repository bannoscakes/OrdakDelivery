import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';
import mbxMatrix from '@mapbox/mapbox-sdk/services/matrix';
import mbxIsochrone from '@mapbox/mapbox-sdk/services/isochrone';
import mbxMapMatching from '@mapbox/mapbox-sdk/services/map-matching';
import env from '@config/env';

// Initialize Mapbox clients
export const geocodingClient = mbxGeocoding({ accessToken: env.MAPBOX_ACCESS_TOKEN });
export const directionsClient = mbxDirections({ accessToken: env.MAPBOX_ACCESS_TOKEN });
export const matrixClient = mbxMatrix({ accessToken: env.MAPBOX_ACCESS_TOKEN });
export const isochroneClient = mbxIsochrone({ accessToken: env.MAPBOX_ACCESS_TOKEN });
export const mapMatchingClient = mbxMapMatching({ accessToken: env.MAPBOX_ACCESS_TOKEN });

// Mapbox Optimization API v2 - currently no official SDK, using fetch
export const MAPBOX_OPTIMIZATION_BASE_URL = 'https://api.mapbox.com/optimized-trips/v2';
