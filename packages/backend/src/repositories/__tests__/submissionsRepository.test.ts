import { SubmissionsRepository } from '../submissionsRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Submission } from '../../domain';

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

describe('SubmissionsRepository', () => {
  beforeEach(() => {
    process.env.SUBMISSIONS_TABLE_NAME = 'Submissions';
    sendMock.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  const baseInput = {
    huntId: 'h1',
    taskId: 't1',
    teamId: 'team1',
    submittedByUserId: 'user1',
    mediaUrl: 'https://example.com',
  };

  it('creates submission', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new SubmissionsRepository();
    const submission = await repo.createSubmission(baseInput);
    expect(submission.status).toBe('pending');
  });

  it('gets submission', async () => {
    const record: Submission = {
      ...baseInput,
      submissionId: 's1',
      status: 'pending',
      submittedAt: 't',
    };
    sendMock.mockResolvedValueOnce({ Item: record });
    const repo = new SubmissionsRepository();
    const res = await repo.getSubmissionById('s1');
    expect(res?.submissionId).toBe('s1');
  });

  it('lists by hunt', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ submissionId: 's1' }] });
    const repo = new SubmissionsRepository();
    const res = await repo.listSubmissionsByHunt('h1');
    expect(res).toHaveLength(1);
  });

  it('lists by task', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ submissionId: 's1' }] });
    const repo = new SubmissionsRepository();
    const res = await repo.listSubmissionsByTask('h1', 't1');
    expect(res).toHaveLength(1);
  });

  it('lists by team', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ submissionId: 's1' }] });
    const repo = new SubmissionsRepository();
    const res = await repo.listSubmissionsByTeam('h1', 'team1');
    expect(res).toHaveLength(1);
  });

  it('updates submission', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { submissionId: 's1', status: 'accepted' } });
    const repo = new SubmissionsRepository();
    const res = await repo.updateSubmission('s1', { status: 'accepted' });
    expect(res.status).toBe('accepted');
  });
});
