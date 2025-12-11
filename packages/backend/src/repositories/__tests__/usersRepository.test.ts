import { UsersRepository } from '../usersRepository';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const send = jest.fn();
  const client = { send };
  return {
    DynamoDBDocumentClient: {
      from: () => client,
    },
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
  };
});

const sendMock = (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any)
  .send as jest.Mock;

describe('UsersRepository', () => {
  beforeEach(() => {
    process.env.USERS_TABLE_NAME = 'UsersTable';
    sendMock.mockReset();
  });

  it('returns null when no item', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new UsersRepository();
    const user = await repo.getUserById('abc');
    expect(user).toBeNull();
  });

  it('returns item when present', async () => {
    sendMock.mockResolvedValueOnce({ Item: { userId: 'abc', createdAt: 't', updatedAt: 't' } });
    const repo = new UsersRepository();
    const user = await repo.getUserById('abc');
    expect(user?.userId).toBe('abc');
  });

  it('creates or updates user', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new UsersRepository();
    const result = await repo.createOrUpdateUser({ userId: 'u1', email: 'test@example.com' });
    expect(result.userId).toBe('u1');
    expect(sendMock).toHaveBeenCalled();
  });
});
