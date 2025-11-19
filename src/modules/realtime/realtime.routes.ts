import { Router } from 'express';
import { realtimeController } from './realtime.controller';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

// Apply authentication to all real-time routes
router.use(authenticate);

/**
 * @route   GET /api/v1/realtime/orders/:id/stream
 * @desc    Stream real-time updates for a specific order (SSE)
 * @access  Private
 */
router.get('/orders/:id/stream', realtimeController.streamOrderUpdates.bind(realtimeController));

/**
 * @route   GET /api/v1/realtime/runs/:id/stream
 * @desc    Stream real-time updates for a specific delivery run (SSE)
 * @access  Private
 */
router.get('/runs/:id/stream', realtimeController.streamRunUpdates.bind(realtimeController));

/**
 * @route   GET /api/v1/realtime/drivers/:id/location
 * @desc    Stream real-time location updates for a specific driver (SSE)
 * @access  Private
 */
router.get('/drivers/:id/location', realtimeController.streamDriverLocation.bind(realtimeController));

export default router;
