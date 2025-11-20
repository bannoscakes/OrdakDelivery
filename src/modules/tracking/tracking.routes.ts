/**
 * Tracking Routes
 *
 * Public tracking endpoints (no authentication required).
 * Used by customer-facing tracking portal.
 */

import { Router } from 'express';
import * as trackingController from './tracking.controller';

const router = Router();

// =====================================================
// PUBLIC ROUTES (no authentication)
// =====================================================

/**
 * @route   GET /api/v1/tracking/:trackingNumber
 * @desc    Get tracking information by tracking number
 * @access  Public
 */
router.get('/:trackingNumber', trackingController.getTracking);

export default router;
