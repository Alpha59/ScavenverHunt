import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthProvider as IdpProvider, buildDiscovery, identityProviderParam, loadAuthEnv, resolveClientId } from './authConfig';
import { AuthState, Tokens, UserProfile, authReducer, initialAuthState } from './authState';

type AuthContextValue = AuthState & {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => void;
  authorizedFetch: (path: string) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const env = loadAuthEnv();
WebBrowser.maybeCompleteAuthSession();

const useAuthFlow = () => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [activeProvider, setActiveProvider] = useState<IdpProvider>('Google');

  const discovery = useMemo(() => buildDiscovery(env.hostedUiUrl), []);
  const clientId = resolveClientId(Platform.OS === 'web' ? 'web' : Platform.OS, env) ?? '';

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
      clientId,
      scopes: ['openid', 'email', 'profile'],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
      extraParams: identityProviderParam(activeProvider),
    },
    discovery,
  );

  useEffect(() => {
    if (env.bypassAuth) {
      const user: UserProfile = {
        userId: env.bypassUserId ?? 'dev-user',
        displayName: env.bypassDisplayName,
        email: env.bypassEmail,
      };
      const tokens: Tokens = { accessToken: 'dev-bypass-token' };
      dispatch({ type: 'set-user', user, tokens });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleResponse = async () => {
      if (!response || response.type !== 'success') return;
      if (!discovery) {
        dispatch({ type: 'set-error', error: 'Hosted UI discovery not configured' });
        return;
      }
      dispatch({ type: 'start-loading' });
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            code: response.params.code,
            clientId,
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
        const profile = await fetchProfile(tokenPayload);
        dispatch({ type: 'set-user', user: profile, tokens: tokenPayload });
      } catch (err) {
        dispatch({
          type: 'set-error',
          error: err instanceof Error ? err.message : 'Authentication failed',
        });
      }
    };
    handleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const fetchProfile = async (activeTokens: Tokens): Promise<UserProfile> => {
    if (!env.apiBaseUrl) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL not set');
    }
    const bearer = activeTokens.accessToken ?? activeTokens.idToken;
    if (!bearer) {
      throw new Error('No token available to call /me');
    }
    const base = env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl : `${env.apiBaseUrl}/`;
    const res = await fetch(`${base}me`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch profile (${res.status})`);
    }
    return res.json();
  };

  const handleSignIn = async (provider: IdpProvider) => {
    setActiveProvider(provider);
    if (!discovery) {
      dispatch({ type: 'set-error', error: 'Hosted UI discovery not configured' });
      return;
    }
    if (!request) {
      dispatch({ type: 'set-error', error: 'Auth request not ready yet' });
      return;
    }
    dispatch({ type: 'start-loading' });
    await promptAsync({
      useProxy: Platform.OS !== 'web',
      extraParams: identityProviderParam(provider),
    });
  };

  const signOut = () => dispatch({ type: 'sign-out' });

  const authorizedFetch = async (path: string) => {
    if (!env.apiBaseUrl) throw new Error('EXPO_PUBLIC_API_BASE_URL not set');
    const bearer = state.tokens?.accessToken ?? state.tokens?.idToken;
    if (!bearer) throw new Error('Not authenticated');
    const base = env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl : `${env.apiBaseUrl}/`;
    return fetch(`${base}${path.replace(/^\//, '')}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
  };

  return {
    state,
    signInWithGoogle: () => handleSignIn('Google'),
    signInWithApple: () => handleSignIn('Apple'),
    signOut,
    authorizedFetch,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, signInWithGoogle, signInWithApple, signOut, authorizedFetch } = useAuthFlow();

  const value: AuthContextValue = {
    ...state,
    signInWithGoogle,
    signInWithApple,
    signOut,
    authorizedFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
