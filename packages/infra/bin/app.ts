import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../lib/core-stack';
import { resolveEnv } from '../src/env-config';
import { AuthStack } from '../lib/auth-stack';
import { DataStack } from '../lib/data-stack';

const app = new cdk.App();

const env = resolveEnv();

const dataStack = new DataStack(app, 'ScavengerHuntDataStack', { env });
new CoreStack(app, 'ScavengerHuntCoreStack', { env, usersTable: dataStack.usersTable });
new AuthStack(app, 'ScavengerHuntAuthStack', { env });
