import * as cdk from '@aws-cdk/core';
import * as codeartifact from '@aws-cdk/aws-codeartifact';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import { CdkPipeline, SimpleSynthAction, ShellScriptAction } from '@aws-cdk/pipelines';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // The code that defines your stack goes here
    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipeline = new CdkPipeline(this, 'Pipeline', {
      pipelineName: 'MyPackagePipeline',
      cloudAssemblyArtifact,

      sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: cdk.SecretValue.secretsManager('github/token'),
        owner: 'avanderm',
        repo: 'aws-codeartifact-demo',
        branch: 'main'
      }),

      synthAction: SimpleSynthAction.standardNpmSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        subdirectory: 'cdk'
      })
    });

    const testProject = new codebuild.PipelineProject(this, 'TestProject', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('cdk/testspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: codebuild.ComputeType.SMALL
      }
    });

    const testStage = pipeline.addStage('Test');
    testStage.addActions(new codepipeline_actions.CodeBuildAction({
      actionName: 'Test',
      project: testProject,
      input: sourceArtifact,
      type: codepipeline_actions.CodeBuildActionType.TEST
    }));

    const repository = new codeartifact.CfnRepository(this, "Repository", {
      domainName: 'brainfartlab',
      repositoryName: 'mypackage'
    });

    const buildRole = undefined;

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('cdk/buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          'REPOSITORY': {
            value: repository.repositoryName,
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT
          },
          'DOMAIN': {
            value: 'brainfartlab',
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT
          },
          'OWNER': {
            value: account,
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT
          }
        }
      },
      role: buildRole
    });

    buildProject.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:aws:codeartifact:${region}:${account}:domain/${repository.domainName}`
      ],
      actions: [
        'codeartifact:GetAuthorizationToken'
      ]
    }));

    const buildStage = pipeline.addStage('Publish');
    buildStage.addActions(new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceArtifact,
      type: codepipeline_actions.CodeBuildActionType.BUILD
    }));
  }
}
