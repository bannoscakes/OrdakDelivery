import rateLimit from 'express-rate-limit';
import env from '../config/env';
import logger from '../config/logger';

/**
 * Rate limiter middleware to prevent abuse
 * Configured via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many requests, please try again later',
    });
  },
});

/**
 * Stricter rate limiter for sensitive endpoints (e.g., authentication, password reset)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per 15 minutes
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    res.status(429).json({
      status: 'error',
      statusCode: 429,
      message: 'Too many attempts, please try again in 15 minutes',
    });
  },
});

/**
 * Webhook-specific rate limiter with higher limits
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute (Shopify webhooks can be frequent)
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Webhook rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});
