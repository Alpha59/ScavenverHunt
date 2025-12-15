import { AuthenticatedUser } from '../auth/jwtVerifier';
import { UserRecord, UsersRepository } from '../repositories/usersRepository';

const deriveDisplayName = (user: AuthenticatedUser): string => {
  const claimedName = [user.givenName, user.familyName].filter(Boolean).join(' ').trim();
  if (claimedName) return claimedName;
  if (user.email) return user.email;
  return 'User';
};

export const getOrCreateUserProfile = async (
  authUser: AuthenticatedUser,
  repo: UsersRepository,
): Promise<UserRecord> => {
  const existing = await repo.getUserById(authUser.userId);
  const derivedDisplayName = deriveDisplayName(authUser);
  const email = authUser.email ?? existing?.email;

  const displayName =
    !existing?.displayName ||
    existing.displayName === 'User' ||
    (authUser.email && existing.displayName === authUser.email)
      ? derivedDisplayName
      : existing.displayName;

  if (!existing) {
    return repo.createOrUpdateUser({
      userId: authUser.userId,
      displayName,
      email,
    });
  }

  const shouldUpdate =
    (displayName && displayName !== existing.displayName) || (email && email !== existing.email);

  if (shouldUpdate) {
    return repo.createOrUpdateUser({
      userId: existing.userId,
      displayName,
      email,
      createdAt: existing.createdAt,
    });
  }

  return existing;
};

export const serializeUser = (user: UserRecord) => ({
  userId: user.userId,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
