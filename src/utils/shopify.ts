import crypto from 'crypto';
import { Request } from 'express';
import env from '@config/env';
import logger from '@config/logger';

/**
 * Verify Shopify webhook HMAC signature
 */
export const verifyShopifyWebhook = (req: Request): boolean => {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    logger.warn('Missing Shopify HMAC header');
    return false;
  }

  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  const isValid = hash === hmacHeader;

  if (!isValid) {
    logger.warn('Invalid Shopify webhook signature', {
      expected: hash,
      received: hmacHeader,
    });
  }

  return isValid;
};

/**
 * Extract shop domain from Shopify webhook
 */
export const getShopDomain = (req: Request): string | null => {
  return req.get('X-Shopify-Shop-Domain') || null;
};

/**
 * Get webhook topic from Shopify webhook
 */
export const getWebhookTopic = (req: Request): string | null => {
  return req.get('X-Shopify-Topic') || null;
};
