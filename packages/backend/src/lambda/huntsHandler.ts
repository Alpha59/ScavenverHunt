// eslint-disable-next-line import/no-unresolved
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifyAuthorizationHeader } from '../auth/jwtVerifier';
import { HuntsRepository } from '../repositories/huntsRepository';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const parseBody = (event: APIGatewayProxyEvent) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const repo = new HuntsRepository();

const ensureOwner = (userId: string, ownerId: string) => {
  if (userId !== ownerId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
};

const handlePostHunt = async (
  userId: string,
  body: Record<string, unknown>,
): Promise<APIGatewayProxyResult> => {
  const required = ['name', 'minTeamSize', 'maxTeamSize', 'allowSolo'];
  const missing = required.filter((key) => body[key] === undefined);
  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ message: `Missing fields: ${missing.join(',')}` }),
    };
  }

  const created = await repo.createHunt({
    ownerId: userId,
    name: String(body.name),
    description: body.description as string | undefined,
    startTime: body.startTime as string | undefined,
    endTime: body.endTime as string | undefined,
    autoCloseAtEndTime: Boolean(body.autoCloseAtEndTime),
    minTeamSize: Number(body.minTeamSize),
    maxTeamSize: Number(body.maxTeamSize),
    allowSolo: Boolean(body.allowSolo),
  });

  return {
    statusCode: 201,
    headers: jsonHeaders,
    body: JSON.stringify(created),
  };
};

const handleGetHunts = async (userId: string): Promise<APIGatewayProxyResult> => {
  const hunts = await repo.listHuntsByOwner(userId);
  return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify(hunts) };
};

const handleGetHuntById = async (
  userId: string,
  huntId: string,
): Promise<APIGatewayProxyResult> => {
  const hunt = await repo.getHuntById(huntId);
  if (!hunt) {
    return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ message: 'Not found' }) };
  }
  try {
    ensureOwner(userId, hunt.ownerId);
  } catch (err) {
    return {
      statusCode: (err as { statusCode?: number }).statusCode ?? 403,
      headers: jsonHeaders,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }
  return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify(hunt) };
};

const handlePatchHunt = async (
  userId: string,
  huntId: string,
  body: Record<string, unknown>,
): Promise<APIGatewayProxyResult> => {
  const hunt = await repo.getHuntById(huntId);
  if (!hunt) {
    return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ message: 'Not found' }) };
  }
  try {
    ensureOwner(userId, hunt.ownerId);
  } catch (err) {
    return {
      statusCode: (err as { statusCode?: number }).statusCode ?? 403,
      headers: jsonHeaders,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  const status = body.status as string | undefined;
  if (status && !['draft', 'active', 'closed'].includes(status)) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ message: 'Invalid status' }),
    };
  }

  const updates = {
    name: body.name as string | undefined,
    description: body.description as string | undefined,
    status: status as 'draft' | 'active' | 'closed' | undefined,
    startTime: body.startTime as string | undefined,
    endTime: body.endTime as string | undefined,
    autoCloseAtEndTime: body.autoCloseAtEndTime as boolean | undefined,
    minTeamSize: body.minTeamSize as number | undefined,
    maxTeamSize: body.maxTeamSize as number | undefined,
    allowSolo: body.allowSolo as boolean | undefined,
  };

  const updated = await repo.updateHunt(huntId, updates);
  return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify(updated) };
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await verifyAuthorizationHeader(event.headers.Authorization ?? event.headers.authorization);
    const path = event.resource ?? event.path;
    const httpMethod = event.httpMethod;
    const body = parseBody(event);
    const huntId = event.pathParameters?.id;

    if (path === '/hunts' && httpMethod === 'POST') {
      return handlePostHunt(user.userId, body);
    }
    if (path === '/hunts' && httpMethod === 'GET') {
      return handleGetHunts(user.userId);
    }
    if (path === '/hunts/{id}' && huntId && httpMethod === 'GET') {
      return handleGetHuntById(user.userId, huntId);
    }
    if (path === '/hunts/{id}' && huntId && httpMethod === 'PATCH') {
      return handlePatchHunt(user.userId, huntId, body);
    }

    return {
      statusCode: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }
};
