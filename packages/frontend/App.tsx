import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './authContext';
import { loadAuthEnv } from './authConfig';

const env = loadAuthEnv();

const LoginScreen = () => {
  const { signInWithGoogle, signInWithApple, loading, error } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Scavenger Hunt</Text>
      <Text style={styles.subtitle}>API base: {env.apiBaseUrl ?? 'not configured'}</Text>
      <Text style={styles.subtitle}>
        Hosted UI: {env.hostedUiUrl ?? 'EXPO_PUBLIC_COGNITO_HOSTED_UI_URL not set'}
      </Text>
      <Button title="Sign in with Google" onPress={signInWithGoogle} disabled={loading} />
      {Platform.OS === 'ios' && (
        <Button title="Sign in with Apple" onPress={signInWithApple} disabled={loading} />
      )}
      {loading && <ActivityIndicator style={styles.spacer} />}
      {error && (
        <Text style={[styles.result, styles.error]} accessibilityRole="text">
          {error}
        </Text>
      )}
    </View>
  );
};

const MainScreen = () => {
  const { user, tokens, loading, error, authorizedFetch, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshProfile = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await authorizedFetch('me');
      const json = await res.json();
      setMessage(JSON.stringify(json, null, 2));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setBusy(false);
    }
  };

  const checkHealth = async () => {
    if (!env.apiBaseUrl) {
      setMessage('EXPO_PUBLIC_API_BASE_URL not set');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const base = env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl : `${env.apiBaseUrl}/`;
      const response = await fetch(`${base}health`);
      const json = await response.json();
      setMessage(JSON.stringify(json, null, 2));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You are signed in.</Text>
      <Text style={styles.subtitle}>Welcome {user?.displayName ?? user?.email ?? user?.userId}</Text>
      <Text style={styles.meta}>
        Token present: {tokens?.accessToken ? 'access' : tokens?.idToken ? 'id' : 'none'}
      </Text>
      <Button title="Refresh /me" onPress={refreshProfile} disabled={busy} />
      <Button title="Check API Health" onPress={checkHealth} disabled={busy} />
      <Button title="Sign out" onPress={signOut} disabled={loading} />
      {(busy || loading) && <ActivityIndicator style={styles.spacer} />}
      {message && (
        <Text style={styles.result} accessibilityRole="text">
          {message}
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
};

const AuthGate = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }
  return user ? <MainScreen /> : <LoginScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
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
