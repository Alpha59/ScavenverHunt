import { APIGatewayProxyHandler } from 'aws-lambda';
import { verifyAuthorizationHeader } from '../auth/jwtVerifier';
import { UsersRepository } from '../repositories/usersRepository';
import { getOrCreateUserProfile, serializeUser } from '../services/currentUser';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const user = await verifyAuthorizationHeader(event.headers.Authorization ?? event.headers.authorization);
    const repo = new UsersRepository();
    const record = await getOrCreateUserProfile(user, repo);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeUser(record)),
    };
  } catch (err) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }
};
