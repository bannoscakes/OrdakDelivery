import { Request, Response } from 'express';
import { realtimeService } from './realtime.service';
import logger from '@config/logger';

export class RealtimeController {
  /**
   * SSE endpoint for order status updates
   * Streams real-time updates for a specific order
   */
  streamOrderUpdates(req: Request, res: Response) {
    const orderId = req.params['id']!;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    logger.info('Client connected to order stream', { orderId, userId: req.user?.id });

    // Subscribe client to order updates
    const clientId = realtimeService.addOrderSubscriber(orderId, res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', orderId })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected from order stream', { orderId, clientId });
      realtimeService.removeOrderSubscriber(orderId, clientId);
    });
  }

  /**
   * SSE endpoint for delivery run updates
   * Streams real-time updates for a specific delivery run
   */
  streamRunUpdates(req: Request, res: Response) {
    const runId = req.params['id']!;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    logger.info('Client connected to run stream', { runId, userId: req.user?.id });

    // Subscribe client to run updates
    const clientId = realtimeService.addRunSubscriber(runId, res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', runId })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected from run stream', { runId, clientId });
      realtimeService.removeRunSubscriber(runId, clientId);
    });
  }

  /**
   * SSE endpoint for driver location updates
   * Streams real-time location for a specific driver
   */
  streamDriverLocation(req: Request, res: Response) {
    const driverId = req.params['id']!;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    logger.info('Client connected to driver location stream', { driverId, userId: req.user?.id });

    // Subscribe client to driver location updates
    const clientId = realtimeService.addDriverSubscriber(driverId, res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', driverId })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      logger.info('Client disconnected from driver location stream', { driverId, clientId });
      realtimeService.removeDriverSubscriber(driverId, clientId);
    });
  }
}

export const realtimeController = new RealtimeController();
