import { Router } from 'express';
import * as ordersController from './orders.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireDispatcher, requireDriver } from '@/middleware/role.middleware';

const router = Router();

// Apply authentication to all order routes
router.use(authenticate);

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (Admin, Dispatcher only)
 */
router.post('/', requireDispatcher, ordersController.createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    List orders with filters and pagination
 * @access  Private
 */
router.get('/', ordersController.listOrders);

/**
 * @route   GET /api/v1/orders/unassigned
 * @desc    Get unassigned orders for a specific date
 * @access  Private
 */
router.get('/unassigned', ordersController.getUnassignedOrders);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', ordersController.getOrder);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order
 * @access  Private (Admin, Dispatcher only)
 */
router.put('/:id', requireDispatcher, ordersController.updateOrder);

/**
 * @route   DELETE /api/v1/orders/:id
 * @desc    Delete order
 * @access  Private (Admin, Dispatcher only)
 */
router.delete('/:id', requireDispatcher, ordersController.deleteOrder);

/**
 * @route   POST /api/v1/orders/:id/proof-of-delivery
 * @desc    Submit proof of delivery (signature, photos, notes)
 * @access  Private (Driver can submit for their runs, Admin/Dispatcher can submit for any)
 */
router.post('/:id/proof-of-delivery', requireDriver, ordersController.submitProofOfDelivery);

/**
 * @route   POST /api/v1/orders/:id/delivered
 * @desc    Mark order as delivered (without proof)
 * @access  Private (Driver can mark for their runs, Admin/Dispatcher can mark any)
 */
router.post('/:id/delivered', requireDriver, ordersController.markAsDelivered);

/**
 * @route   POST /api/v1/orders/:id/failed
 * @desc    Mark order as failed with reason
 * @access  Private (Driver can mark for their runs, Admin/Dispatcher can mark any)
 */
router.post('/:id/failed', requireDriver, ordersController.markAsFailed);

export default router;
