import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { Task } from '../domain';
import { tableConfig } from '../config';

export interface CreateTaskInput {
  title: string;
  description?: string;
  points: number;
  tags?: string[];
  facetValues?: Record<string, string>;
  maxCompletionsPerTeam?: number | null;
  maxTeamsCanComplete?: number | null;
}

export class TasksRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.tasksTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async createTask(huntId: string, input: CreateTaskInput): Promise<Task> {
    if (input.points < 0) throw new Error('points must be non-negative');
    const now = new Date().toISOString();
    const task: Task = {
      taskId: randomUUID(),
      huntId,
      title: input.title,
      description: input.description,
      points: input.points,
      tags: input.tags ?? [],
      facetValues: input.facetValues,
      maxCompletionsPerTeam: input.maxCompletionsPerTeam ?? null,
      maxTeamsCanComplete: input.maxTeamsCanComplete ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: task,
        ConditionExpression: 'attribute_not_exists(taskId)',
      }),
    );

    return task;
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { taskId },
      }),
    );
    return (result.Item as Task | undefined) ?? null;
  }

  async listTasksByHunt(huntId: string): Promise<Task[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'huntId',
        KeyConditionExpression: 'huntId = :huntId',
        ExpressionAttributeValues: { ':huntId': huntId },
      }),
    );
    return (result.Items as Task[] | undefined) ?? [];
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const allowed: Array<keyof Task> = [
      'title',
      'description',
      'points',
      'tags',
      'facetValues',
      'maxCompletionsPerTeam',
      'maxTeamsCanComplete',
    ];
    const entries = Object.entries(updates).filter(
      ([key, value]) => value !== undefined && allowed.includes(key as keyof Task),
    );
    if (entries.length === 0) {
      const existing = await this.getTaskById(taskId);
      if (!existing) throw new Error('Task not found');
      return existing;
    }
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const sets: string[] = [];
    entries.forEach(([key, value], idx) => {
      const nk = `#k${idx}`;
      const vk = `:v${idx}`;
      names[nk] = key;
      values[vk] = value;
      sets.push(`${nk} = ${vk}`);
    });
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = new Date().toISOString();
    sets.push('#updatedAt = :updatedAt');

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { taskId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    if (!result.Attributes) throw new Error('Task not found');
    return result.Attributes as Task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { taskId },
      }),
    );
  }
}
