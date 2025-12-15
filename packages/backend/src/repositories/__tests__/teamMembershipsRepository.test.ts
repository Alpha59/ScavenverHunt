import { TeamMembershipsRepository } from '../teamMembershipsRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const send = jest.fn();
  const client = { send };
  return {
    DynamoDBDocumentClient: {
      from: () => client,
    },
    PutCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    QueryCommand: jest.fn(),
  };
});

const sendMock = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send as jest.Mock
);

describe('TeamMembershipsRepository', () => {
  beforeEach(() => {
    process.env.TEAM_MEMBERSHIPS_TABLE_NAME = 'TeamMemberships';
    sendMock.mockReset();
  });

  it('adds member', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamMembershipsRepository();
    const membership = await repo.addMember('team1', 'user1', 'member');
    expect(membership.teamId).toBe('team1');
  });

  it('removes member', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TeamMembershipsRepository();
    await repo.removeMember('team1', 'user1');
    expect(sendMock).toHaveBeenCalled();
  });

  it('lists members by team', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ teamId: 'team1', userId: 'user1' }] });
    const repo = new TeamMembershipsRepository();
    const res = await repo.listMembersByTeam('team1');
    expect(res).toHaveLength(1);
  });

  it('lists teams by user', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ teamId: 'team1', userId: 'user1' }] });
    const repo = new TeamMembershipsRepository();
    const res = await repo.listTeamsByUser('user1');
    expect(res).toHaveLength(1);
  });
});
