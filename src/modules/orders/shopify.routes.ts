import { Router } from 'express';
import { handleWebhook } from './shopify.controller';
import { validateShopifyWebhook } from '@/middleware/shopifyWebhook';

const router = Router();

/**
 * @route   POST /api/v1/webhooks/shopify
 * @desc    Handle Shopify webhooks (orders/create, orders/updated, orders/cancelled)
 * @access  Public (verified by HMAC)
 */
router.post('/', validateShopifyWebhook, handleWebhook);

export default router;
