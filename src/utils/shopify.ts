import crypto from 'crypto';
import { Request } from 'express';
import env from '@config/env';
import logger from '@config/logger';

/**
 * Verify Shopify webhook HMAC signature using timing-safe comparison
 * IMPORTANT: Requires raw body buffer - use express.raw() middleware for webhook endpoint
 */
export const verifyShopifyWebhook = (req: Request): boolean => {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    logger.warn('Missing Shopify HMAC header');
    return false;
  }

  // Use raw body buffer if available, otherwise fall back to stringified JSON
  // Note: For proper verification, webhook endpoint should use express.raw()
  const body = (req as any).rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');

  if (!Buffer.isBuffer(body)) {
    logger.error('Webhook body is not a buffer - HMAC verification may fail');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_WEBHOOK_SECRET)
    .update(body)
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash, 'utf8'),
      Buffer.from(hmacHeader, 'utf8')
    );

    if (!isValid) {
      logger.warn('Invalid Shopify webhook signature');
    }

    return isValid;
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    logger.warn('Invalid Shopify webhook signature - length mismatch');
    return false;
  }
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
