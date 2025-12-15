import { HuntsRepository } from '../huntsRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Hunt } from '../../domain';

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const send = jest.fn();
  const client = { send };
  return {
    DynamoDBDocumentClient: {
      from: () => client,
    },
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
    QueryCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn(),
  };
});

const sendMock = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send as jest.Mock
);

describe('HuntsRepository', () => {
  beforeEach(() => {
    process.env.HUNTS_TABLE_NAME = 'Hunts';
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    sendMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates hunt with defaults', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new HuntsRepository();
    const hunt = await repo.createHunt({
      ownerId: 'owner-1',
      name: 'Test Hunt',
      minTeamSize: 1,
      maxTeamSize: 5,
      allowSolo: true,
    });
    expect(hunt.ownerId).toBe('owner-1');
    expect(sendMock).toHaveBeenCalled();
  });

  it('validates team sizes', async () => {
    const repo = new HuntsRepository();
    await expect(
      repo.createHunt({
        ownerId: 'owner-1',
        name: 'Bad',
        minTeamSize: 3,
        maxTeamSize: 2,
        allowSolo: false,
      }),
    ).rejects.toThrow('Invalid team size constraints');
  });

  it('returns hunt by id', async () => {
    const record: Hunt = {
      huntId: 'h1',
      ownerId: 'o1',
      name: 'Hunt',
      gameCode: 'CODE1',
      status: 'draft',
      minTeamSize: 1,
      maxTeamSize: 5,
      allowSolo: true,
      createdAt: 't',
      updatedAt: 't',
      description: 'desc',
    };
    sendMock.mockResolvedValueOnce({ Item: record });
    const repo = new HuntsRepository();
    const result = await repo.getHuntById('h1');
    expect(result?.huntId).toBe('h1');
  });

  it('lists hunts by owner', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ huntId: 'h1' }] });
    const repo = new HuntsRepository();
    const hunts = await repo.listHuntsByOwner('owner-1');
    expect(hunts).toHaveLength(1);
  });

  it('updates hunt fields', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { huntId: 'h1', name: 'New', updatedAt: 't' } });
    const repo = new HuntsRepository();
    const updated = await repo.updateHunt('h1', { name: 'New' });
    expect(updated.name).toBe('New');
  });

  it('delete hunt', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new HuntsRepository();
    await repo.deleteHunt('h1');
    expect(sendMock).toHaveBeenCalled();
  });
});
