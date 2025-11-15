import { Router } from 'express';
import * as ordersController from './orders.controller';
import { authenticate } from '@/middleware/authenticate';

const router = Router();

// Apply authentication to all order routes
router.use(authenticate);

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post('/', ordersController.createOrder);

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
 * @access  Private
 */
router.put('/:id', ordersController.updateOrder);

/**
 * @route   DELETE /api/v1/orders/:id
 * @desc    Delete order
 * @access  Private
 */
router.delete('/:id', ordersController.deleteOrder);

export default router;
