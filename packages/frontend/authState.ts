export type Tokens = {
  accessToken?: string;
  idToken?: string;
};

export type UserProfile = {
  userId: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthState = {
  user: UserProfile | null;
  tokens: Tokens | null;
  loading: boolean;
  error: string | null;
};

export type AuthAction =
  | { type: 'start-loading' }
  | { type: 'set-user'; user: UserProfile; tokens: Tokens }
  | { type: 'set-error'; error: string }
  | { type: 'sign-out' };

export const initialAuthState: AuthState = {
  user: null,
  tokens: null,
  loading: false,
  error: null,
};

export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'start-loading':
      return { ...state, loading: true, error: null };
    case 'set-user':
      return { ...state, loading: false, error: null, user: action.user, tokens: action.tokens };
    case 'set-error':
      return { ...state, loading: false, error: action.error };
    case 'sign-out':
      return { ...initialAuthState };
    default:
      return state;
  }
};
