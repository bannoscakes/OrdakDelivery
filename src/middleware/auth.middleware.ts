import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../types/auth.types';
import logger from '../config/logger';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try to get token from cookie first (for admin dashboard), then from Authorization header (for mobile app)
    let token: string | undefined;

    // Check HttpOnly cookie first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else {
      // Fall back to Authorization header for mobile app
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been deactivated',
      });
      return;
    }

    // Attach user to request
    req.user = user as AuthUser;

    next();
  } catch (error) {
    // Security: Log error details server-side only, don't expose to client
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token',
    });
  }
};

// Optional authentication - doesn't fail if no token, just doesn't attach user
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try to get token from cookie first (for admin dashboard), then from Authorization header (for mobile app)
    let token: string | undefined;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = user as AuthUser;
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires authenticate middleware to run first
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Convenience middleware for admin-only endpoints
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Convenience middleware for admin or dispatcher
 */
export const requireAdminOrDispatcher = requireRole('ADMIN', 'DISPATCHER');
