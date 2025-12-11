import { NextFunction, Request, Response } from 'express';
import { AuthenticatedUser, verifyAuthorizationHeader } from './jwtVerifier';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await verifyAuthorizationHeader(req.headers.authorization);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
