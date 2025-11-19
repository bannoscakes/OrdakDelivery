import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export const requireRole = (allowedRoles: UserRole[]) => {
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
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
};

// Specific role shortcuts
export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireDispatcher = requireRole([UserRole.ADMIN, UserRole.DISPATCHER]);
export const requireDriver = requireRole([UserRole.ADMIN, UserRole.DRIVER]);
