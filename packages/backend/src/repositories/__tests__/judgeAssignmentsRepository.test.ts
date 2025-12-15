import { JudgeAssignmentsRepository } from '../judgeAssignmentsRepository';
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

describe('JudgeAssignmentsRepository', () => {
  beforeEach(() => {
    process.env.JUDGE_ASSIGNMENTS_TABLE_NAME = 'JudgeAssignments';
    sendMock.mockReset();
  });

  it('assigns judge', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new JudgeAssignmentsRepository();
    const record = await repo.assignJudge('hunt1', 'user1');
    expect(record.userId).toBe('user1');
  });

  it('removes judge', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new JudgeAssignmentsRepository();
    await repo.removeJudge('hunt1', 'user1');
    expect(sendMock).toHaveBeenCalled();
  });

  it('lists judges', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ huntId: 'hunt1', userId: 'user1' }] });
    const repo = new JudgeAssignmentsRepository();
    const res = await repo.listJudgesByHunt('hunt1');
    expect(res).toHaveLength(1);
  });
});
