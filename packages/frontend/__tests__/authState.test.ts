import { authReducer, initialAuthState } from '../authState';

describe('authReducer', () => {
  it('starts loading', () => {
    const state = authReducer(initialAuthState, { type: 'start-loading' });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets user and tokens', () => {
    const state = authReducer(initialAuthState, {
      type: 'set-user',
      user: { userId: 'u1', displayName: 'Test' },
      tokens: { accessToken: 'abc' },
    });
    expect(state.user?.userId).toBe('u1');
    expect(state.tokens?.accessToken).toBe('abc');
    expect(state.loading).toBe(false);
  });

  it('sets error', () => {
    const state = authReducer({ ...initialAuthState, loading: true }, { type: 'set-error', error: 'oops' });
    expect(state.error).toBe('oops');
    expect(state.loading).toBe(false);
  });

  it('signs out', () => {
    const state = authReducer(
      { user: { userId: 'u1' }, tokens: { accessToken: 'x' }, loading: false, error: null },
      { type: 'sign-out' },
    );
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
    expect(state.loading).toBe(false);
  });
});
