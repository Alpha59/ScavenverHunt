import { createMeHandler } from '../me';
import { UsersRepository, UserRecord } from '../../repositories/usersRepository';
import { AuthenticatedRequest } from '../../auth/authMiddleware';
import { Response } from 'express';

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as { json: jest.Mock; status: jest.Mock };
};

describe('meHandler', () => {
  const repoMock = {
    getUserById: jest.fn(),
    createOrUpdateUser: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;

  beforeEach(() => {
    jest.resetAllMocks();
    repoMock.getUserById.mockReset();
    repoMock.createOrUpdateUser.mockReset();
  });

  it('returns 401 when request has no user', async () => {
    const handler = createMeHandler(() => repoMock);
    const res = createMockResponse();
    await handler({} as AuthenticatedRequest, res as unknown as Response, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('creates user on first call', async () => {
    const newUser: UserRecord = {
      userId: 'user-1',
      displayName: 'Test User',
      email: 'test@example.com',
      createdAt: 'now',
      updatedAt: 'now',
    };
    repoMock.getUserById.mockResolvedValueOnce(null);
    repoMock.createOrUpdateUser.mockResolvedValueOnce(newUser);

    const handler = createMeHandler(() => repoMock);
    const res = createMockResponse();
    const req = { user: { userId: 'user-1', email: 'test@example.com' } } as AuthenticatedRequest;
    await handler(req, res as unknown as Response, jest.fn());

    expect(repoMock.createOrUpdateUser).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      userId: 'user-1',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarUrl: undefined,
      createdAt: 'now',
      updatedAt: 'now',
    });
  });

  it('returns existing user without updating when unchanged', async () => {
    const existing: UserRecord = {
      userId: 'user-2',
      displayName: 'Existing',
      email: 'existing@example.com',
      avatarUrl: 'avatar',
      createdAt: 'then',
      updatedAt: 'then',
    };
    repoMock.getUserById.mockResolvedValueOnce(existing);

    const handler = createMeHandler(() => repoMock);
    const res = createMockResponse();
    const req = { user: { userId: 'user-2', email: 'existing@example.com' } } as AuthenticatedRequest;
    await handler(req, res as unknown as Response, jest.fn());

    expect(repoMock.createOrUpdateUser).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      userId: 'user-2',
      displayName: 'Existing',
      email: 'existing@example.com',
      avatarUrl: 'avatar',
      createdAt: 'then',
      updatedAt: 'then',
    });
  });

  it('updates existing user when profile claims change', async () => {
    const existing: UserRecord = {
      userId: 'user-3',
      displayName: 'User',
      email: 'old@example.com',
      createdAt: 'then',
      updatedAt: 'then',
    };
    repoMock.getUserById.mockResolvedValueOnce(existing);
    repoMock.createOrUpdateUser.mockResolvedValueOnce({
      ...existing,
      displayName: 'New Name',
      email: 'new@example.com',
      updatedAt: 'now',
    });

    const handler = createMeHandler(() => repoMock);
    const res = createMockResponse();
    const req = {
      user: { userId: 'user-3', email: 'new@example.com', givenName: 'New', familyName: 'Name' },
    } as AuthenticatedRequest;
    await handler(req, res as unknown as Response, jest.fn());

    expect(repoMock.createOrUpdateUser).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      userId: 'user-3',
      displayName: 'New Name',
      email: 'new@example.com',
      avatarUrl: undefined,
      createdAt: 'then',
      updatedAt: 'now',
    });
  });
});
