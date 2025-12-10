import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    if (!API_BASE_URL) {
      setError('EXPO_PUBLIC_API_BASE_URL not set');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
      const response = await fetch(`${base}health`);
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Health check failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scavenger Hunt frontend is running.</Text>
      <Text style={styles.subtitle}>API base: {API_BASE_URL ?? 'not configured'}</Text>
      <Button title="Check API Health" onPress={checkHealth} />
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
  subtitle: { marginBottom: 12 },
  spacer: { marginTop: 12 },
  result: { marginTop: 12, textAlign: 'center' },
  error: { color: 'red' },
});
