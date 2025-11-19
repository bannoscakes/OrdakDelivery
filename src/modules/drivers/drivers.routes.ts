import { Router } from 'express';
import * as driversController from './drivers.controller';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

// Apply authentication to all driver routes
router.use(authenticate);

/**
 * @route   POST /api/v1/drivers
 * @desc    Create a new driver
 * @access  Private
 */
router.post('/', driversController.createDriver);

/**
 * @route   GET /api/v1/drivers
 * @desc    List drivers with filters and pagination
 * @access  Private
 */
router.get('/', driversController.listDrivers);

/**
 * @route   GET /api/v1/drivers/available
 * @desc    Get available drivers for a specific date
 * @access  Private
 */
router.get('/available', driversController.getAvailableDrivers);

/**
 * @route   GET /api/v1/drivers/:id
 * @desc    Get driver by ID
 * @access  Private
 */
router.get('/:id', driversController.getDriver);

/**
 * @route   PUT /api/v1/drivers/:id
 * @desc    Update driver
 * @access  Private
 */
router.put('/:id', driversController.updateDriver);

/**
 * @route   DELETE /api/v1/drivers/:id
 * @desc    Delete driver
 * @access  Private
 */
router.delete('/:id', driversController.deleteDriver);

export default router;
