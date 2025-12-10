import * as cdk from 'aws-cdk-lib';

/**
 * Resolve the AWS account/region for CDK stacks.
 * Prefers CDK_DEFAULT_* (set automatically by CDK), falls back to AWS_ACCOUNT/AWS_REGION,
 * and defaults region to us-east-1 to align with the codex-sandbox profile.
 *
 * Typical usage when running locally:
 * AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth
 */
export const resolveEnv = (): cdk.Environment => {
  const account =
    process.env.CDK_DEFAULT_ACCOUNT ??
    process.env.AWS_ACCOUNT ??
    process.env.AWS_ACCOUNT_ID ??
    undefined;

  const region =
    process.env.CDK_DEFAULT_REGION ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    'us-east-1';

  return { account, region };
};
