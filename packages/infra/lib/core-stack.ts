import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface CoreStackProps extends cdk.StackProps {
  usersTable?: dynamodb.ITable;
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

    const healthFunction = new lambdaNodejs.NodejsFunction(this, 'HealthLambda', {
      entry: path.join(__dirname, '..', '..', 'backend', 'src', 'lambda', 'healthHandler.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
    });

    if (props?.usersTable) {
      healthFunction.addEnvironment('USERS_TABLE_NAME', props.usersTable.tableName);
      props.usersTable.grantReadWriteData(healthFunction);
    }

    new cdk.CfnOutput(this, 'HealthLambdaName', {
      value: healthFunction.functionName,
    });

    const api = new apigateway.RestApi(this, 'ScavengerHuntApi', {
      restApiName: 'ScavengerHuntApi',
    });

    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));

    new cdk.CfnOutput(this, 'ApiBaseUrl', {
      value: api.url,
    });
  }
}
