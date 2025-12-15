import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../core-stack';

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({
    functionName: 'mock',
    grantInvoke: jest.fn(),
    addPermission: jest.fn(),
  })),
}));

jest.mock('aws-cdk-lib/aws-apigateway', () => {
  const addMethod = jest.fn();
  const resourceFactory = () => {
    const resource = { addMethod } as {
      addMethod: jest.Mock;
      addResource?: jest.Mock;
    };
    resource.addResource = jest.fn(() => resource);
    return resource;
  };
  const api = { root: { addResource: jest.fn(() => resourceFactory()) }, url: 'https://example.test/' };
  return {
    RestApi: jest.fn(() => api),
    LambdaIntegration: jest.fn(),
  };
});

describe('CoreStack', () => {
  it('initializes without resources', () => {
    const app = new cdk.App();
    const stack = new CoreStack(app, 'TestStack');

    expect(stack).toBeDefined();
  });
});
