import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { TeamMembership, TeamRole } from '../domain';
import { tableConfig } from '../config';

export class TeamMembershipsRepository {
  private tableName: string;
  private client: DynamoDBDocumentClient;

  constructor(tableName = tableConfig.teamMembershipsTableName()) {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMembership> {
    const now = new Date().toISOString();
    const membership: TeamMembership = {
      teamId,
      userId,
      roleWithinTeam: role,
      createdAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: membership,
      }),
    );
    return membership;
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { teamId, userId },
      }),
    );
  }

  async listMembersByTeam(teamId: string): Promise<TeamMembership[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );
    return (result.Items as TeamMembership[] | undefined) ?? [];
  }

  async listTeamsByUser(userId: string): Promise<TeamMembership[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'userId',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      }),
    );
    return (result.Items as TeamMembership[] | undefined) ?? [];
  }
}
