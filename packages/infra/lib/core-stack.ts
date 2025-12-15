import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface DataTablesProps {
  usersTable?: dynamodb.ITable;
  huntsTable?: dynamodb.ITable;
  tasksTable?: dynamodb.ITable;
  teamsTable?: dynamodb.ITable;
  teamMembershipsTable?: dynamodb.ITable;
  judgeAssignmentsTable?: dynamodb.ITable;
  submissionsTable?: dynamodb.ITable;
  teamScoresTable?: dynamodb.ITable;
}

export interface CoreStackProps extends cdk.StackProps {
  tables?: DataTablesProps;
  authConfig?: {
    userPoolId: string;
    region: string;
    clientIds: string[];
    domainPrefix?: string;
  };
}

export class CoreStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: CoreStackProps) {
    super(scope, id, props);

    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: assetsBucket.bucketName,
    });

    const tableEnv: Record<string, string> = {
      ...(props?.tables?.usersTable ? { USERS_TABLE_NAME: props.tables.usersTable.tableName } : {}),
      ...(props?.tables?.huntsTable ? { HUNTS_TABLE_NAME: props.tables.huntsTable.tableName } : {}),
      ...(props?.tables?.tasksTable ? { TASKS_TABLE_NAME: props.tables.tasksTable.tableName } : {}),
      ...(props?.tables?.teamsTable ? { TEAMS_TABLE_NAME: props.tables.teamsTable.tableName } : {}),
      ...(props?.tables?.teamMembershipsTable
        ? { TEAM_MEMBERSHIPS_TABLE_NAME: props.tables.teamMembershipsTable.tableName }
        : {}),
      ...(props?.tables?.judgeAssignmentsTable
        ? { JUDGE_ASSIGNMENTS_TABLE_NAME: props.tables.judgeAssignmentsTable.tableName }
        : {}),
      ...(props?.tables?.submissionsTable
        ? { SUBMISSIONS_TABLE_NAME: props.tables.submissionsTable.tableName }
        : {}),
      ...(props?.tables?.teamScoresTable
        ? { TEAM_SCORES_TABLE_NAME: props.tables.teamScoresTable.tableName }
        : {}),
    };

    const healthFunction = new lambdaNodejs.NodejsFunction(this, 'HealthLambda', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'lambda', 'healthHandler.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        ...tableEnv,
      },
    });

    Object.values(props?.tables ?? {}).forEach((table) => {
      table?.grantReadWriteData(healthFunction);
    });

    new cdk.CfnOutput(this, 'HealthLambdaName', {
      value: healthFunction.functionName,
    });

    const api = new apigateway.RestApi(this, 'ScavengerHuntApi', {
      restApiName: 'ScavengerHuntApi',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      },
    });

    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));

    const cognitoEnv = props?.authConfig
      ? {
          COGNITO_REGION: props.authConfig.region,
          COGNITO_USER_POOL_ID: props.authConfig.userPoolId,
          COGNITO_CLIENT_IDS: props.authConfig.clientIds.join(','),
          ...(props.authConfig.domainPrefix
            ? { COGNITO_DOMAIN_PREFIX: props.authConfig.domainPrefix }
            : {}),
        }
      : {
          COGNITO_REGION: process.env.COGNITO_REGION ?? '',
          COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID ?? '',
          COGNITO_CLIENT_IDS: process.env.COGNITO_CLIENT_IDS ?? '',
          ...(process.env.COGNITO_DOMAIN_PREFIX
            ? { COGNITO_DOMAIN_PREFIX: process.env.COGNITO_DOMAIN_PREFIX }
            : {}),
        };

    const meFunction = new lambdaNodejs.NodejsFunction(this, 'MeLambda', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'lambda', 'meHandler.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      environment: {
        ...tableEnv,
        ...cognitoEnv,
      },
    });
    Object.values(props?.tables ?? {}).forEach((table) => {
      table?.grantReadWriteData(meFunction);
    });

    const meResource = api.root.addResource('me');
    meResource.addMethod('GET', new apigateway.LambdaIntegration(meFunction));

    new cdk.CfnOutput(this, 'ApiBaseUrl', {
      value: api.url,
    });
  }
}
