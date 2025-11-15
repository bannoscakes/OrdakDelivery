import { Request, Response, NextFunction } from 'express';
import { verifyShopifyWebhook } from '@/utils/shopify';
import { AppError } from './errorHandler';

export const validateShopifyWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const isValid = verifyShopifyWebhook(req);

  if (!isValid) {
    // Use next(error) instead of throw in async middleware
    next(new AppError(401, 'Invalid Shopify webhook signature'));
    return;
  }

  next();
};
