import { TasksRepository } from '../tasksRepository';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Task } from '../../domain';

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

describe('TasksRepository', () => {
  beforeEach(() => {
    process.env.TASKS_TABLE_NAME = 'Tasks';
    sendMock.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('creates task', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TasksRepository();
    const task = await repo.createTask('hunt1', { title: 'Do', points: 5 });
    expect(task.huntId).toBe('hunt1');
    expect(sendMock).toHaveBeenCalled();
  });

  it('validates non-negative points', async () => {
    const repo = new TasksRepository();
    await expect(repo.createTask('hunt1', { title: 'Bad', points: -1 })).rejects.toThrow(
      'points must be non-negative',
    );
  });

  it('gets task by id', async () => {
    const task: Task = {
      taskId: 't1',
      huntId: 'h1',
      title: 'Task',
      points: 1,
      tags: [],
      createdAt: 't',
      updatedAt: 't',
    };
    sendMock.mockResolvedValueOnce({ Item: task });
    const repo = new TasksRepository();
    const res = await repo.getTaskById('t1');
    expect(res?.taskId).toBe('t1');
  });

  it('lists tasks by hunt', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ taskId: 't1' }] });
    const repo = new TasksRepository();
    const res = await repo.listTasksByHunt('h1');
    expect(res).toHaveLength(1);
  });

  it('updates task', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { taskId: 't1', title: 'New' } });
    const repo = new TasksRepository();
    const updated = await repo.updateTask('t1', { title: 'New' });
    expect(updated.title).toBe('New');
  });

  it('deletes task', async () => {
    sendMock.mockResolvedValueOnce({});
    const repo = new TasksRepository();
    await repo.deleteTask('t1');
    expect(sendMock).toHaveBeenCalled();
  });
});
