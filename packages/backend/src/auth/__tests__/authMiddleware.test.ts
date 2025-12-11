import { authMiddleware, AuthenticatedRequest } from '../authMiddleware';
import { AuthenticatedUser } from '../jwtVerifier';
import * as jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
import { Response } from 'express';

// Mock jwks-rsa to return the public key generated in each test
jest.mock('jwks-rsa', () => {
  return () => ({
    getSigningKey: async () => ({
      getPublicKey: () =>
        (global as unknown as { __testPublicKey?: string }).__testPublicKey,
    }),
  });
});

describe('authMiddleware', () => {
  const region = 'us-east-1';
  const userPoolId = 'us-east-1_testPool';
  const audience = 'test-client';

  const buildToken = (payload: Record<string, unknown>): string => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    (global as unknown as { __testPublicKey?: string }).__testPublicKey = publicKey
      .export({ type: 'pkcs1', format: 'pem' })
      .toString();
    return jwt.sign(payload, privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(), {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      audience,
    });
  };

  const buildMocks = () => {
    const req: Partial<AuthenticatedRequest> = { headers: {} };
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = jest.fn();
    return { req, res, next, json, status };
  };

  beforeEach(() => {
    process.env.COGNITO_REGION = region;
    process.env.COGNITO_USER_POOL_ID = userPoolId;
    process.env.COGNITO_CLIENT_IDS = audience;
  });

  it('attaches user on valid token', async () => {
    const { req, res, next } = buildMocks();
    const token = buildToken({
      sub: 'user-123',
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User',
    });
    req.headers = { authorization: `Bearer ${token}` };

    await authMiddleware(req as AuthenticatedRequest, res, next);

    expect(next).toHaveBeenCalled();
    const user = (req as AuthenticatedRequest).user as AuthenticatedUser;
    expect(user.userId).toBe('user-123');
    expect(user.email).toBe('test@example.com');
  });

  it('returns 401 on missing auth header', async () => {
    const { req, res, next, status, json } = buildMocks();
    await authMiddleware(req as AuthenticatedRequest, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});
