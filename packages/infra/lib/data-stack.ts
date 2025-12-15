import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DataStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly huntsTable: dynamodb.Table;
  public readonly tasksTable: dynamodb.Table;
  public readonly teamsTable: dynamodb.Table;
  public readonly teamMembershipsTable: dynamodb.Table;
  public readonly judgeAssignmentsTable: dynamodb.Table;
  public readonly submissionsTable: dynamodb.Table;
  public readonly teamScoresTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.huntsTable = new dynamodb.Table(this, 'HuntsTable', {
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.huntsTable.addGlobalSecondaryIndex({
      indexName: 'ownerId',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.tasksTable = new dynamodb.Table(this, 'TasksTable', {
      partitionKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.tasksTable.addGlobalSecondaryIndex({
      indexName: 'huntId',
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.teamsTable = new dynamodb.Table(this, 'TeamsTable', {
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.teamsTable.addGlobalSecondaryIndex({
      indexName: 'huntId',
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.teamMembershipsTable = new dynamodb.Table(this, 'TeamMembershipsTable', {
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.teamMembershipsTable.addGlobalSecondaryIndex({
      indexName: 'userId',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.judgeAssignmentsTable = new dynamodb.Table(this, 'JudgeAssignmentsTable', {
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.submissionsTable = new dynamodb.Table(this, 'SubmissionsTable', {
      partitionKey: { name: 'submissionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.submissionsTable.addGlobalSecondaryIndex({
      indexName: 'huntId',
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.submissionsTable.addGlobalSecondaryIndex({
      indexName: 'huntId-taskId',
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.submissionsTable.addGlobalSecondaryIndex({
      indexName: 'huntId-teamId',
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.teamScoresTable = new dynamodb.Table(this, 'TeamScoresTable', {
      partitionKey: { name: 'huntId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
    });
    new cdk.CfnOutput(this, 'HuntsTableName', {
      value: this.huntsTable.tableName,
    });
    new cdk.CfnOutput(this, 'TasksTableName', {
      value: this.tasksTable.tableName,
    });
    new cdk.CfnOutput(this, 'TeamsTableName', {
      value: this.teamsTable.tableName,
    });
    new cdk.CfnOutput(this, 'TeamMembershipsTableName', {
      value: this.teamMembershipsTable.tableName,
    });
    new cdk.CfnOutput(this, 'JudgeAssignmentsTableName', {
      value: this.judgeAssignmentsTable.tableName,
    });
    new cdk.CfnOutput(this, 'SubmissionsTableName', {
      value: this.submissionsTable.tableName,
    });
    new cdk.CfnOutput(this, 'TeamScoresTableName', {
      value: this.teamScoresTable.tableName,
    });
  }
}
