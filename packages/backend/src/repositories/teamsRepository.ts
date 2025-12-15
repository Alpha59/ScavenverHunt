import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { Team } from '../domain';
import { tableConfig } from '../config';

export class TeamsRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.teamsTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async createTeam(huntId: string, name: string): Promise<Team> {
    const now = new Date().toISOString();
    const team: Team = {
      teamId: randomUUID(),
      huntId,
      name,
      createdAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: team,
        ConditionExpression: 'attribute_not_exists(teamId)',
      }),
    );
    return team;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { teamId },
      }),
    );
    return (result.Item as Team | undefined) ?? null;
  }

  async listTeamsByHunt(huntId: string): Promise<Team[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'huntId',
        KeyConditionExpression: 'huntId = :huntId',
        ExpressionAttributeValues: { ':huntId': huntId },
      }),
    );
    return (result.Items as Team[] | undefined) ?? [];
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const allowed: Array<keyof Team> = ['name'];
    const entries = Object.entries(updates).filter(
      ([key, value]) => value !== undefined && allowed.includes(key as keyof Team),
    );
    if (entries.length === 0) {
      const existing = await this.getTeamById(teamId);
      if (!existing) throw new Error('Team not found');
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
        Key: { teamId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    if (!result.Attributes) throw new Error('Team not found');
    return result.Attributes as Team;
  }
}
