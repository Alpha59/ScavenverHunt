import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export interface UserRecord {
  userId: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

import { tableConfig } from '../config';

export class UsersRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.usersTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      }),
    );

    return (result.Item as UserRecord | undefined) ?? null;
  }

  async createOrUpdateUser(
    user: Omit<UserRecord, 'createdAt' | 'updatedAt'> & Partial<Pick<UserRecord, 'createdAt'>>,
  ): Promise<UserRecord> {
    const now = new Date().toISOString();
    const item: UserRecord = {
      ...user,
      createdAt: user.createdAt ?? now,
      updatedAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return item;
  }
}
