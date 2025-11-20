/**
 * Time-related constants for the application
 */

import { OrderType } from '@prisma/client';

/**
 * Default service duration (delivery time) in seconds
 * Used when no specific service duration is provided for an order
 */
export const DEFAULT_SERVICE_DURATION_SECONDS = 300; // 5 minutes

/**
 * Service duration configuration by order type (in seconds)
 * Represents parking + unloading + delivery/pickup time at each stop
 */
export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 300, // 5 minutes for deliveries
  pickup: 180, // 3 minutes for pickups (typically faster)
};

/**
 * Get service duration for a specific order type
 * @param orderType - The type of order (delivery or pickup)
 * @returns Service duration in seconds
 */
export function getServiceDuration(orderType: OrderType | null | undefined): number {
  if (!orderType) {
    return DEFAULT_SERVICE_DURATION_SECONDS;
  }
  return SERVICE_DURATION_BY_TYPE[orderType] || DEFAULT_SERVICE_DURATION_SECONDS;
}

/**
 * Milliseconds in one day (for date calculations)
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Milliseconds in one week (for date calculations)
 */
export const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Milliseconds in one hour (for date calculations)
 */
export const MS_PER_HOUR = 60 * 60 * 1000;
