import { buildDiscovery, identityProviderParam, loadAuthEnv, resolveClientId } from '../authConfig';

describe('authConfig helpers', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB = 'web-client';
    process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_NATIVE = 'native-client';
    process.env.EXPO_PUBLIC_COGNITO_HOSTED_UI_URL = 'https://example.auth.region.amazoncognito.com';
  });

  it('resolves client ids per platform', () => {
    const env = loadAuthEnv();
    expect(resolveClientId('web', env)).toBe('web-client');
    expect(resolveClientId('ios', env)).toBe('native-client');
    expect(resolveClientId('android', env)).toBe('native-client');
  });

  it('falls back to web client id when native is missing', () => {
    delete process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_NATIVE;
    const env = loadAuthEnv();
    expect(resolveClientId('ios', env)).toBe('web-client');
  });

  it('builds discovery endpoints', () => {
    const discovery = buildDiscovery(process.env.EXPO_PUBLIC_COGNITO_HOSTED_UI_URL);
    expect(discovery?.authorizationEndpoint).toContain('/oauth2/authorize');
    expect(discovery?.tokenEndpoint).toContain('/oauth2/token');
  });

  it('loads bypass settings', () => {
    process.env.EXPO_PUBLIC_AUTH_BYPASS = 'true';
    process.env.EXPO_PUBLIC_AUTH_BYPASS_USER_ID = 'dev';
    const env = loadAuthEnv();
    expect(env.bypassAuth).toBe(true);
    expect(env.bypassUserId).toBe('dev');
  });

  it('returns identity_provider param', () => {
    expect(identityProviderParam('Apple')).toEqual({ identity_provider: 'Apple' });
  });
});
