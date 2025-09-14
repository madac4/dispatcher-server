import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtDTO } from '../types/auth.types';
import { ErrorHandler } from '../utils/ErrorHandler';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return next(new ErrorHandler('No token provided', 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtDTO;

    if (!decoded.id || !decoded.role) {
      return next(new ErrorHandler('Invalid token payload', 401));
    }

    req.user = decoded;
    next();
  } catch (error) {
    return next(new ErrorHandler('Invalid token', 401));
  }
};

export const decodeToken = (req: Request): JwtDTO | ErrorHandler => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return new ErrorHandler('No token provided', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtDTO;

  if (!decoded.id || !decoded.role) {
    return new ErrorHandler('Invalid token payload', 401);
  }

  req.user = decoded;
  return decoded;
};
