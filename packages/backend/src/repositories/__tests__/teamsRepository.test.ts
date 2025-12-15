import { TeamsRepository } from '../teamsRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Team } from '../../domain';

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
  };
});

const sendMock = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send as jest.Mock
);

describe('TeamsRepository', () => {
  beforeEach(() => {
    process.env.TEAMS_TABLE_NAME = 'Teams';
    sendMock.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('creates team', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamsRepository();
    const team = await repo.createTeam('hunt1', 'Team A');
    expect(team.huntId).toBe('hunt1');
  });

  it('gets team', async () => {
    const team: Team = { teamId: 't1', huntId: 'h1', name: 'Team', createdAt: 'now' };
    sendMock.mockResolvedValueOnce({ Item: team });
    const repo = new TeamsRepository();
    const res = await repo.getTeamById('t1');
    expect(res?.teamId).toBe('t1');
  });

  it('lists by hunt', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ teamId: 't1' }] });
    const repo = new TeamsRepository();
    const res = await repo.listTeamsByHunt('h1');
    expect(res).toHaveLength(1);
  });

  it('updates team', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { teamId: 't1', name: 'New' } });
    const repo = new TeamsRepository();
    const res = await repo.updateTeam('t1', { name: 'New' });
    expect(res.name).toBe('New');
  });
});
