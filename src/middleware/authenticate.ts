import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import logger from '../config/logger';

interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Middleware to authenticate requests using JWT tokens
 * Expects a Bearer token in the Authorization header
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'No authorization header provided',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Invalid authorization format. Expected: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'No token provided',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

      // Validate payload structure
      if (!decoded.id || !decoded.email || !decoded.role) {
        res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: 'Invalid token payload',
        });
        return;
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: 'Token has expired',
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: 'Invalid token',
        });
        return;
      }

      logger.error('JWT verification error:', error);
      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Authentication error',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Optional: Middleware to check if user has required role
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};
