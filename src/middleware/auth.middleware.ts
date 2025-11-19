import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { prisma } from '../lib/prisma';
import { AuthUser } from '../types/auth.types';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

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
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
};

// Optional authentication - doesn't fail if no token, just doesn't attach user
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
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

export const requireAdmin = requireRole('ADMIN');
export const requireAdminOrDispatcher = requireRole('ADMIN', 'DISPATCHER');
