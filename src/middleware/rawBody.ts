import { Request, Response, NextFunction } from 'express';
import { json } from 'express';

/**
 * Middleware to preserve raw body for HMAC verification while still parsing JSON
 * This is necessary for webhook signature verification
 */
export const preserveRawBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  json({
    verify: (req: any, res, buf, encoding) => {
      // Store raw body buffer for HMAC verification
      req.rawBody = buf;
    },
  })(req, res, next);
};
