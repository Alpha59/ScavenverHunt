import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { JudgeAssignment } from '../domain';
import { tableConfig } from '../config';

export class JudgeAssignmentsRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.judgeAssignmentsTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async assignJudge(huntId: string, userId: string): Promise<JudgeAssignment> {
    const record: JudgeAssignment = {
      huntId,
      userId,
      createdAt: new Date().toISOString(),
    };
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: record,
      }),
    );
    return record;
  }

  async removeJudge(huntId: string, userId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { huntId, userId },
      }),
    );
  }

  async listJudgesByHunt(huntId: string): Promise<JudgeAssignment[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'huntId = :huntId',
        ExpressionAttributeValues: { ':huntId': huntId },
      }),
    );
    return (result.Items as JudgeAssignment[] | undefined) ?? [];
  }
}
