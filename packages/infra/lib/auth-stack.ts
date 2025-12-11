import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface AuthStackProps extends cdk.StackProps {
  webCallbackUrls?: string[];
  webLogoutUrls?: string[];
  nativeCallbackUrls?: string[];
  nativeLogoutUrls?: string[];
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly webClient: cognito.UserPoolClient;
  public readonly nativeClient: cognito.UserPoolClient;

  constructor(scope: cdk.App, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    const {
      webCallbackUrls = ['http://localhost:19006'],
      webLogoutUrls = ['http://localhost:19006'],
      nativeCallbackUrls = ['myapp://callback'],
      nativeLogoutUrls = ['myapp://callback'],
    } = props ?? {};

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.webClient = new cognito.UserPoolClient(this, 'WebUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      oAuth: {
        callbackUrls: webCallbackUrls,
        logoutUrls: webLogoutUrls,
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
    });

    this.nativeClient = new cognito.UserPoolClient(this, 'NativeUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      oAuth: {
        callbackUrls: nativeCallbackUrls,
        logoutUrls: nativeLogoutUrls,
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientWebId', {
      value: this.webClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientNativeId', {
      value: this.nativeClient.userPoolClientId,
    });
  }
}
