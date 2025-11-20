/**
 * Tracking Controller
 *
 * Handles HTTP requests for public order tracking.
 * No authentication required - designed for customer-facing tracking portal.
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import trackingService from './tracking.service';
import { z } from 'zod';
import logger from '@config/logger';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const trackingNumberSchema = z.object({
  params: z.object({
    trackingNumber: z.string().min(1, 'Tracking number is required'),
  }),
});

const orderIdSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
});

// =====================================================
// CONTROLLER FUNCTIONS
// =====================================================

/**
 * Get tracking information by tracking number (PUBLIC)
 *
 * @route GET /api/v1/tracking/:trackingNumber
 * @access Public (no authentication required)
 */
export const getTracking = asyncHandler(async (req: Request, res: Response) => {
  const { params } = trackingNumberSchema.parse({ params: req.params });

  logger.info('Tracking request received', { trackingNumber: params.trackingNumber });

  const trackingInfo = await trackingService.getTrackingInfo(params.trackingNumber);

  res.json({
    success: true,
    data: trackingInfo,
  });
});

/**
 * Generate tracking URL for an order (INTERNAL - requires auth)
 *
 * @route POST /api/v1/orders/:orderId/tracking-url
 * @access Private (requires authentication)
 */
export const generateTrackingUrl = asyncHandler(async (req: Request, res: Response) => {
  const { params } = orderIdSchema.parse({ params: req.params });

  logger.info('Generate tracking URL request', { orderId: params.orderId });

  const result = await trackingService.generateAndSaveTrackingUrl(params.orderId);

  res.json({
    success: true,
    data: result,
  });
});
