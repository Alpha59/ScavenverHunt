import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '../auth/authMiddleware';
import { UsersRepository } from '../repositories/usersRepository';
import { getOrCreateUserProfile, serializeUser } from '../services/currentUser';

export const createMeHandler =
  (repoFactory: () => UsersRepository = () => new UsersRepository()): RequestHandler =>
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRecord = await getOrCreateUserProfile(req.user, repoFactory());
    res.json(serializeUser(userRecord));
  };

export const meHandler = createMeHandler();
