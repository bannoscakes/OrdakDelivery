import { Router } from 'express';
import * as runsController from './runs.controller';
import { authenticate, requireAdminOrDispatcher } from '@/middleware/auth.middleware';

const router = Router();

// Apply authentication to all delivery run routes
router.use(authenticate);

/**
 * @route   POST /api/v1/runs
 * @desc    Create a new delivery run
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/', requireAdminOrDispatcher, runsController.createRun);

/**
 * @route   GET /api/v1/runs
 * @desc    List delivery runs with filters and pagination
 * @access  Private
 */
router.get('/', runsController.listRuns);

/**
 * @route   GET /api/v1/runs/:id
 * @desc    Get delivery run by ID
 * @access  Private
 */
router.get('/:id', runsController.getRun);

/**
 * @route   PUT /api/v1/runs/:id
 * @desc    Update delivery run
 * @access  Private (Admin, Dispatcher only)
 */
router.put('/:id', requireAdminOrDispatcher, runsController.updateRun);

/**
 * @route   DELETE /api/v1/runs/:id
 * @desc    Delete delivery run
 * @access  Private (Admin, Dispatcher only)
 */
router.delete('/:id', requireAdminOrDispatcher, runsController.deleteRun);

/**
 * @route   POST /api/v1/runs/:id/assign
 * @desc    Assign orders to delivery run
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/:id/assign', requireAdminOrDispatcher, runsController.assignOrders);

/**
 * @route   POST /api/v1/runs/:id/unassign
 * @desc    Unassign orders from delivery run
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/:id/unassign', requireAdminOrDispatcher, runsController.unassignOrders);

/**
 * @route   POST /api/v1/runs/:id/optimize
 * @desc    Optimize delivery run using Mapbox Optimization API
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/:id/optimize', requireAdminOrDispatcher, runsController.optimizeRun);

/**
 * @route   POST /api/v1/runs/:id/start
 * @desc    Start delivery run
 * @access  Private (Driver can start their own runs, Admin/Dispatcher can start any)
 */
router.post('/:id/start', runsController.startRun);

/**
 * @route   POST /api/v1/runs/:id/complete
 * @desc    Complete delivery run
 * @access  Private (Driver can complete their own runs, Admin/Dispatcher can complete any)
 */
router.post('/:id/complete', runsController.completeRun);

export default router;
