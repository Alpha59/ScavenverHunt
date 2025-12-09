import * as cdk from 'aws-cdk-lib';
import { CoreStack } from '../lib/core-stack';

const app = new cdk.App();

// Placeholder stack; resources will be added in later phases.
new CoreStack(app, 'ScavengerHuntCoreStack');
