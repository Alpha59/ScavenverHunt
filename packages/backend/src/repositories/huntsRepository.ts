import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID, randomBytes } from 'crypto';
import { Hunt } from '../domain';
import { tableConfig } from '../config';

export interface CreateHuntInput {
  ownerId: string;
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  autoCloseAtEndTime?: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  allowSolo: boolean;
}

export class HuntsRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.huntsTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  private buildGameCode(length = 6): string {
    return randomBytes(length)
      .toString('base64')
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, length)
      .toUpperCase();
  }

  async createHunt(input: CreateHuntInput): Promise<Hunt> {
    if (input.minTeamSize < 1 || input.maxTeamSize < input.minTeamSize) {
      throw new Error('Invalid team size constraints');
    }
    const now = new Date().toISOString();
    const hunt: Hunt = {
      huntId: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      gameCode: this.buildGameCode(),
      status: 'draft',
      startTime: input.startTime,
      endTime: input.endTime,
      autoCloseAtEndTime: input.autoCloseAtEndTime ?? false,
      minTeamSize: input.minTeamSize,
      maxTeamSize: input.maxTeamSize,
      allowSolo: input.allowSolo,
      createdAt: now,
      updatedAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: hunt,
        ConditionExpression: 'attribute_not_exists(huntId)',
      }),
    );

    return hunt;
  }

  async getHuntById(huntId: string): Promise<Hunt | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { huntId },
      }),
    );
    return (result.Item as Hunt | undefined) ?? null;
  }

  async listHuntsByOwner(ownerId: string): Promise<Hunt[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'ownerId',
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
      }),
    );
    return (result.Items as Hunt[] | undefined) ?? [];
  }

  async updateHunt(huntId: string, updates: Partial<Hunt>): Promise<Hunt> {
    const allowedFields: Array<keyof Hunt> = [
      'name',
      'description',
      'status',
      'startTime',
      'endTime',
      'autoCloseAtEndTime',
      'minTeamSize',
      'maxTeamSize',
      'allowSolo',
    ];

    const entries = Object.entries(updates).filter(([key, value]) => value !== undefined && allowedFields.includes(key as keyof Hunt));
    if (entries.length === 0) {
      const existing = await this.getHuntById(huntId);
      if (!existing) throw new Error('Hunt not found');
      return existing;
    }

    const expressionParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    entries.forEach(([key, value], index) => {
      const nameKey = `#k${index}`;
      const valueKey = `:v${index}`;
      names[nameKey] = key;
      values[valueKey] = value;
      expressionParts.push(`${nameKey} = ${valueKey}`);
    });

    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = new Date().toISOString();
    expressionParts.push('#updatedAt = :updatedAt');

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { huntId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    if (!result.Attributes) {
      throw new Error('Hunt not found');
    }

    return result.Attributes as Hunt;
  }

  async deleteHunt(huntId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { huntId },
      }),
    );
  }
}
