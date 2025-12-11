import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../lib/core-stack';
import { resolveEnv } from '../src/env-config';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();

const env = resolveEnv();

// Placeholder stack; resources will be added in later phases.
new CoreStack(app, 'ScavengerHuntCoreStack', { env });
new AuthStack(app, 'ScavengerHuntAuthStack', { env });
