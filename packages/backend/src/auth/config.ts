export interface AuthConfig {
  userPoolId: string;
  region: string;
  audiences?: string[];
}

export const loadAuthConfig = (): AuthConfig => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.COGNITO_REGION ?? process.env.AWS_REGION;
  const audiences =
    process.env.COGNITO_CLIENT_IDS?.split(',').map((id) => id.trim()).filter(Boolean) ?? undefined;

  if (!userPoolId || !region) {
    throw new Error('Auth configuration missing: set COGNITO_USER_POOL_ID and COGNITO_REGION');
  }

  return { userPoolId, region, audiences };
};
