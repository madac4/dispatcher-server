import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/auth.types';
import { ErrorHandler } from '../utils/ErrorHandler';

export const rolesMiddleware = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorHandler('Authentication required', 401));
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return next(
        new ErrorHandler(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403)
      );
    }

    next();
  };
};
