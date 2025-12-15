export type AuthEnv = {
  apiBaseUrl?: string;
  hostedUiUrl?: string;
  clientIdWeb?: string;
  clientIdNative?: string;
};

export type AuthProvider = 'Google' | 'Apple';

export const loadAuthEnv = (): AuthEnv => ({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  hostedUiUrl: process.env.EXPO_PUBLIC_COGNITO_HOSTED_UI_URL,
  clientIdWeb: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB,
  clientIdNative:
    process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_NATIVE ?? process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB,
});

export const resolveClientId = (platform: 'web' | 'ios' | 'android', env: AuthEnv): string | undefined =>
  platform === 'web' ? env.clientIdWeb : env.clientIdNative ?? env.clientIdWeb;

export const buildDiscovery = (hostedUiUrl?: string) =>
  hostedUiUrl
    ? {
        authorizationEndpoint: `${hostedUiUrl}/oauth2/authorize`,
        tokenEndpoint: `${hostedUiUrl}/oauth2/token`,
        revocationEndpoint: `${hostedUiUrl}/oauth2/revoke`,
      }
    : undefined;

export const identityProviderParam = (provider: AuthProvider) => ({ identity_provider: provider });
