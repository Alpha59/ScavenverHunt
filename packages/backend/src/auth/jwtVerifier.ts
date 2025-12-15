import type { JwtHeader, JwtPayload } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { loadAuthConfig } from './config';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}

const getSigningKey = async (kid: string, jwksUri: string): Promise<string> => {
  const client = new jwksRsa.JwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
  });

  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
};

export const verifyJwt = async (token: string): Promise<AuthenticatedUser> => {
  const { userPoolId, region, audiences } = loadAuthConfig();
  const decoded = jwt.decode(token, { complete: true }) as
    | { header: JwtHeader; payload: JwtPayload }
    | null;

  if (!decoded || !decoded.header.kid) {
    throw new Error('Invalid token header');
  }

  const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const publicKey = await getSigningKey(decoded.header.kid, jwksUri);

  let audienceOption: string | [string, ...string[]] | undefined;
  if (audiences && audiences.length > 0) {
    audienceOption =
      audiences.length === 1 ? audiences[0] : [audiences[0], ...audiences.slice(1)];
  }

  const verified = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    audience: audienceOption,
  }) as JwtPayload;

  return {
    userId: verified.sub as string,
    email: verified.email as string | undefined,
    givenName: verified.given_name as string | undefined,
    familyName: verified.family_name as string | undefined,
  };
};

const extractBearer = (header?: string): string => {
  if (!header) throw new Error('Missing Authorization header');
  const [scheme, value] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !value) {
    throw new Error('Invalid Authorization header');
  }
  return value;
};

export const verifyAuthorizationHeader = async (authorization?: string): Promise<AuthenticatedUser> => {
  const token = extractBearer(authorization);
  return verifyJwt(token);
};
