import { StatusBar } from 'expo-status-bar';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const COGNITO_HOSTED_UI_URL = process.env.EXPO_PUBLIC_COGNITO_HOSTED_UI_URL;
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB;

AuthSession.maybeCompleteAuthSession();

type Tokens = {
  accessToken?: string;
  idToken?: string;
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  const discovery = useMemo(() => {
    if (!COGNITO_HOSTED_UI_URL) return undefined;
    return {
      authorizationEndpoint: `${COGNITO_HOSTED_UI_URL}/oauth2/authorize`,
      tokenEndpoint: `${COGNITO_HOSTED_UI_URL}/oauth2/token`,
      revocationEndpoint: `${COGNITO_HOSTED_UI_URL}/oauth2/revoke`,
    };
  }, []);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        native: 'myapp://callback',
        useProxy: Platform.OS !== 'web',
      }),
    [],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: COGNITO_CLIENT_ID ?? '',
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { identity_provider: 'Google' },
    },
    discovery,
  );

  useEffect(() => {
    const handleResponse = async () => {
      if (!response || response.type !== 'success') return;
      if (!discovery) {
        setError('Hosted UI discovery not configured');
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            code: response.params.code,
            clientId: COGNITO_CLIENT_ID ?? '',
            redirectUri,
            extraParams: {
              code_verifier: request?.codeVerifier ?? '',
              grant_type: 'authorization_code',
            },
          },
          discovery,
        );
        const tokenPayload: Tokens = {
          accessToken: tokenResult.accessToken ?? tokenResult.access_token,
          idToken: tokenResult.idToken ?? tokenResult.id_token,
        };
        setTokens(tokenPayload);
        await fetchProfile(tokenPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth failed');
      } finally {
        setLoading(false);
      }
    };
    handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const fetchProfile = async (activeTokens: Tokens) => {
    if (!API_BASE_URL) {
      setError('EXPO_PUBLIC_API_BASE_URL not set');
      return;
    }
    const bearer = activeTokens.accessToken ?? activeTokens.idToken;
    if (!bearer) {
      setError('No token available to call /me');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
      const res = await fetch(`${base}me`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch profile (${res.status})`);
      }
      const json = await res.json();
      setUser(json);
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile fetch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scavenger Hunt Auth (Google)</Text>
      <Text style={styles.subtitle}>API base: {API_BASE_URL ?? 'not configured'}</Text>
      <Text style={styles.subtitle}>
        Hosted UI: {COGNITO_HOSTED_UI_URL ?? 'EXPO_PUBLIC_COGNITO_HOSTED_UI_URL not set'}
      </Text>
      <Button
        title="Sign in with Google"
        onPress={() => promptAsync({ useProxy: Platform.OS !== 'web' })}
        disabled={!discovery || !request || !COGNITO_CLIENT_ID || loading}
      />
      {tokens?.accessToken && (
        <Text style={styles.meta}>Access token acquired (truncated): {tokens.accessToken.slice(0, 12)}...</Text>
      )}
      {user && (
        <Text style={styles.meta}>User: {(user as { displayName?: string }).displayName ?? 'Loaded'}</Text>
      )}
      {loading && <ActivityIndicator style={styles.spacer} />}
      {result && (
        <Text style={styles.result} accessibilityRole="text">
          {result}
        </Text>
      )}
      {error && (
        <Text style={[styles.result, styles.error]} accessibilityRole="text">
          {error}
        </Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { marginBottom: 6, textAlign: 'center' },
  spacer: { marginTop: 12 },
  result: { marginTop: 12, textAlign: 'center' },
  error: { color: 'red' },
  meta: { marginTop: 8, fontSize: 12, color: '#333', textAlign: 'center' },
});
