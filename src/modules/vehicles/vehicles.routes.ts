import { Router } from 'express';
import * as vehiclesController from './vehicles.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireDispatcher } from '@/middleware/role.middleware';

const router = Router();

// Apply authentication to all vehicle routes
router.use(authenticate);

/**
 * @route   POST /api/v1/vehicles
 * @desc    Create a new vehicle
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/', requireDispatcher, vehiclesController.createVehicle);

/**
 * @route   GET /api/v1/vehicles
 * @desc    List vehicles with filters and pagination
 * @access  Private
 */
router.get('/', vehiclesController.listVehicles);

/**
 * @route   GET /api/v1/vehicles/available
 * @desc    Get available vehicles for a specific date
 * @access  Private
 */
router.get('/available', vehiclesController.getAvailableVehicles);

/**
 * @route   GET /api/v1/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get('/:id', vehiclesController.getVehicle);

/**
 * @route   PUT /api/v1/vehicles/:id
 * @desc    Update vehicle
 * @access  Private (Admin, Dispatcher only)
 */
router.put('/:id', requireDispatcher, vehiclesController.updateVehicle);

/**
 * @route   DELETE /api/v1/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private (Admin, Dispatcher only)
 */
router.delete('/:id', requireDispatcher, vehiclesController.deleteVehicle);

export default router;
