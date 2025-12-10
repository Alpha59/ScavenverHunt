import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class CoreStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
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

    new cdk.CfnOutput(this, 'HealthLambdaName', {
      value: healthFunction.functionName,
    });
  }
}
