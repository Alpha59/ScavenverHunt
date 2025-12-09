import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../core-stack';

describe('CoreStack', () => {
  it('initializes without resources', () => {
    const app = new cdk.App();
    const stack = new CoreStack(app, 'TestStack');

    expect(stack).toBeDefined();
  });
});
