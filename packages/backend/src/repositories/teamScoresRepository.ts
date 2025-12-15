import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TeamScore } from '../domain';
import { tableConfig } from '../config';

export class TeamScoresRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.teamScoresTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async getTeamScore(huntId: string, teamId: string): Promise<TeamScore | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { huntId, teamId },
      }),
    );
    return (result.Item as TeamScore | undefined) ?? null;
  }

  async upsertTeamScore(huntId: string, teamId: string, deltaPoints: number): Promise<TeamScore> {
    const existing = (await this.getTeamScore(huntId, teamId)) ?? {
      huntId,
      teamId,
      totalPoints: 0,
      updatedAt: new Date().toISOString(),
    };
    const updated: TeamScore = {
      ...existing,
      totalPoints: existing.totalPoints + deltaPoints,
      updatedAt: new Date().toISOString(),
    };
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: updated,
      }),
    );
    return updated;
  }
}
