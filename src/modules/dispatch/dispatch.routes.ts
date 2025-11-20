/**
 * Dispatch Routes
 *
 * Defines all routes for zone-based dispatch operations
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import * as dispatchController from './dispatch.controller';

const router = Router();

// Apply authentication to all dispatch routes
router.use(authenticate);

// =====================================================
// ZONE TEMPLATE ROUTES
// =====================================================

/**
 * POST /zones/templates/apply
 * Apply a zone template (weekday or weekend)
 */
router.post('/zones/templates/apply', dispatchController.applyZoneTemplate);

/**
 * GET /zones/active
 * Get active zones for a specific date
 */
router.get('/zones/active', dispatchController.getActiveZones);

// =====================================================
// AUTO-ASSIGNMENT ROUTES
// =====================================================

/**
 * POST /orders/auto-assign
 * Auto-assign orders to zones based on delivery address
 */
router.post('/orders/auto-assign', dispatchController.autoAssignOrders);

// =====================================================
// DRAFT RUN ROUTES
// =====================================================

/**
 * POST /runs/create-drafts
 * Create draft runs for all zones on a specific date
 */
router.post('/runs/create-drafts', dispatchController.createDraftRuns);

/**
 * POST /runs/:runId/add-order
 * Add an order to a draft run
 */
router.post('/runs/:runId/add-order', dispatchController.addOrderToRun);

/**
 * POST /runs/:runId/remove-order
 * Remove an order from a draft run
 */
router.post('/runs/:runId/remove-order', dispatchController.removeOrderFromRun);

/**
 * POST /runs/:runId/reorder
 * Reorder stops within a draft run
 */
router.post('/runs/:runId/reorder', dispatchController.reorderStops);

/**
 * POST /orders/move
 * Move an order from one draft run to another
 */
router.post('/orders/move', dispatchController.moveOrderBetweenRuns);

// =====================================================
// ZONE BALANCE ROUTES
// =====================================================

/**
 * GET /zones/balance
 * Check zone balance and get recommendations
 */
router.get('/zones/balance', dispatchController.checkZoneBalance);

/**
 * POST /zones/rebalance
 * Rebalance zones by moving orders between zones
 */
router.post('/zones/rebalance', dispatchController.rebalanceZones);

// =====================================================
// FLEET ASSIGNMENT ROUTES
// =====================================================

/**
 * GET /fleet/available
 * Get available drivers and vehicles for a specific date
 */
router.get('/fleet/available', dispatchController.getAvailableFleet);

/**
 * POST /runs/:runId/assign
 * Assign driver and vehicle to a draft run
 */
router.post('/runs/:runId/assign', dispatchController.assignDriverVehicle);

/**
 * POST /runs/assign-bulk
 * Bulk assign drivers and vehicles to multiple runs
 */
router.post('/runs/assign-bulk', dispatchController.bulkAssignDrivers);

// =====================================================
// FINALIZATION ROUTES
// =====================================================

/**
 * POST /runs/:runId/finalize
 * Finalize a single run (optimize route, send SMS notifications)
 */
router.post('/runs/:runId/finalize', dispatchController.finalizeRun);

/**
 * POST /runs/finalize-all
 * Finalize all draft runs for a specific date
 */
router.post('/runs/finalize-all', dispatchController.finalizeAllRuns);

export default router;
