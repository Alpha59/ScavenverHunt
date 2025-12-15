import { TeamScoresRepository } from '../teamScoresRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TeamScore } from '../../domain';

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

const sendMock = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send as jest.Mock
);

describe('TeamScoresRepository', () => {
  beforeEach(() => {
    process.env.TEAM_SCORES_TABLE_NAME = 'TeamScores';
    sendMock.mockReset();
  });

  it('returns null when not found', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamScoresRepository();
    const res = await repo.getTeamScore('h1', 'team1');
    expect(res).toBeNull();
  });

  it('upserts score', async () => {
    // First get returns null
    sendMock.mockResolvedValueOnce({});
    // Put result
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamScoresRepository();
    const res = await repo.upsertTeamScore('h1', 'team1', 10);
    expect(res.totalPoints).toBe(10);
  });

  it('increments existing score', async () => {
    const existing: TeamScore = { huntId: 'h1', teamId: 'team1', totalPoints: 5, updatedAt: 't' };
    sendMock.mockResolvedValueOnce({ Item: existing });
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamScoresRepository();
    const res = await repo.upsertTeamScore('h1', 'team1', 3);
    expect(res.totalPoints).toBe(8);
  });
});
