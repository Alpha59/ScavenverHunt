import type { APIGatewayProxyHandler } from 'aws-lambda';
import { buildHealthResponse } from '../health';

export const handler: APIGatewayProxyHandler = async () => {
  const payload = { ...buildHealthResponse(), service: 'backend-lambda' as const };
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(payload),
  };
};
