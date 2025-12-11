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
  public readonly googleProvider?: cognito.UserPoolIdentityProviderGoogle;

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

    const supportedIdps: cognito.UserPoolClientIdentityProvider[] = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];

    const googleClientId =
      process.env.GOOGLE_OAUTH_CLIENT_ID ?? this.node.tryGetContext('googleClientId');
    const googleClientSecret =
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? this.node.tryGetContext('googleClientSecret');

    if (googleClientId && googleClientSecret) {
      this.googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdP', {
        userPool: this.userPool,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });
      supportedIdps.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    } else {
      cdk.Annotations.of(this).addWarning(
        'Google OAuth env vars not provided; Google IdP will not be configured.',
      );
    }

    this.webClient = new cognito.UserPoolClient(this, 'WebUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      supportedIdentityProviders: supportedIdps,
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
      supportedIdentityProviders: supportedIdps,
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
