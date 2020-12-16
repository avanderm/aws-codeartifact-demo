#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkStack } from '../pipeline/cdk-stack';

const app = new cdk.App();
new CdkStack(app, 'CodeArtifactDemoPipeline', {
  env: {
    account: '159832336530',
    region: 'eu-west-1'
  }
});
