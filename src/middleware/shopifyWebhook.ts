import { Request, Response, NextFunction } from 'express';
import { verifyShopifyWebhook } from '@/utils/shopify';
import { AppError } from './errorHandler';

export const validateShopifyWebhook = (req: Request, res: Response, next: NextFunction) => {
  const isValid = verifyShopifyWebhook(req);

  if (!isValid) {
    throw new AppError(401, 'Invalid Shopify webhook signature');
  }

  next();
};
