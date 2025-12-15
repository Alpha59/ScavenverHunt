import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { Submission } from '../domain';
import { tableConfig } from '../config';

export type CreateSubmissionInput = Omit<Submission, 'submissionId' | 'status' | 'submittedAt'>;

export class SubmissionsRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.submissionsTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    const now = new Date().toISOString();
    const submission: Submission = {
      ...input,
      submissionId: randomUUID(),
      status: 'pending',
      submittedAt: now,
    };
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: submission,
        ConditionExpression: 'attribute_not_exists(submissionId)',
      }),
    );
    return submission;
  }

  async getSubmissionById(submissionId: string): Promise<Submission | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { submissionId },
      }),
    );
    return (result.Item as Submission | undefined) ?? null;
  }

  async listSubmissionsByHunt(huntId: string): Promise<Submission[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'huntId',
        KeyConditionExpression: 'huntId = :huntId',
        ExpressionAttributeValues: { ':huntId': huntId },
      }),
    );
    return (result.Items as Submission[] | undefined) ?? [];
  }

  async listSubmissionsByTask(huntId: string, taskId: string): Promise<Submission[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'huntId-taskId',
        KeyConditionExpression: 'huntId = :huntId AND taskId = :taskId',
        ExpressionAttributeValues: { ':huntId': huntId, ':taskId': taskId },
      }),
    );
    return (result.Items as Submission[] | undefined) ?? [];
  }

  async listSubmissionsByTeam(huntId: string, teamId: string): Promise<Submission[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'huntId-teamId',
        KeyConditionExpression: 'huntId = :huntId AND teamId = :teamId',
        ExpressionAttributeValues: { ':huntId': huntId, ':teamId': teamId },
      }),
    );
    return (result.Items as Submission[] | undefined) ?? [];
  }

  async updateSubmission(submissionId: string, updates: Partial<Submission>): Promise<Submission> {
    const allowed: Array<keyof Submission> = [
      'status',
      'judgedByUserId',
      'judgedAt',
      'judgeComment',
      'awardedPoints',
      'isFavorite',
      'mediaUrl',
      'thumbnailUrl',
      'notes',
      'teamId',
      'taskId',
    ];
    const entries = Object.entries(updates).filter(
      ([key, value]) => value !== undefined && allowed.includes(key as keyof Submission),
    );
    if (entries.length === 0) {
      const existing = await this.getSubmissionById(submissionId);
      if (!existing) throw new Error('Submission not found');
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

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { submissionId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    if (!result.Attributes) throw new Error('Submission not found');
    return result.Attributes as Submission;
  }
}
