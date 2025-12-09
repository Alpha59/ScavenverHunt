import * as cdk from 'aws-cdk-lib';

export class CoreStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Resources will be defined in later phases.
  }
}
