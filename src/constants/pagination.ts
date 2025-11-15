/**
 * Pagination constants for API endpoints
 */

/**
 * Maximum number of items that can be requested per page
 * Prevents abuse and protects against DoS via excessive data fetching
 */
export const MAX_PAGINATION_LIMIT = 100;

/**
 * Default number of items per page when not specified
 */
export const DEFAULT_PAGINATION_LIMIT = 20;
