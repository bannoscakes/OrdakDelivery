import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import shopifyService from './shopify.service';
import { getWebhookTopic } from '@/utils/shopify';
import logger from '@config/logger';

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const topic = getWebhookTopic(req);
  const orderData = req.body;

  logger.info('Received Shopify webhook', { topic });

  switch (topic) {
    case 'orders/create':
      await shopifyService.handleOrderCreated(orderData);
      break;

    case 'orders/updated':
      await shopifyService.handleOrderUpdated(orderData);
      break;

    case 'orders/cancelled':
      await shopifyService.handleOrderCancelled(orderData);
      break;

    default:
      logger.warn('Unhandled Shopify webhook topic', { topic });
  }

  // Always respond 200 OK to Shopify
  res.status(200).json({ received: true });
});
