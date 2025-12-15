const createHuntMock = jest.fn();
const listHuntsMock = jest.fn();
const getHuntMock = jest.fn();
const updateHuntMock = jest.fn();

jest.mock('../../auth/jwtVerifier', () => ({
  verifyAuthorizationHeader: jest.fn().mockResolvedValue({ userId: 'user-1' }),
}));

jest.mock('../../repositories/huntsRepository', () => {
  return {
    HuntsRepository: jest.fn().mockImplementation(() => ({
      createHunt: createHuntMock,
      listHuntsByOwner: listHuntsMock,
      getHuntById: getHuntMock,
      updateHunt: updateHuntMock,
    })),
  };
});

// require after mocks
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { handler } = require('../huntsHandler');

describe('huntsHandler', () => {
  beforeEach(() => {
    createHuntMock.mockReset();
    listHuntsMock.mockReset();
    getHuntMock.mockReset();
    updateHuntMock.mockReset();
  });

  const baseEvent: Partial<APIGatewayProxyEvent> = {
    headers: { Authorization: 'Bearer token' },
    pathParameters: {},
    resource: '/hunts',
    path: '/hunts',
  };

  it('creates hunt', async () => {
    createHuntMock.mockResolvedValueOnce({ huntId: 'h1' });
    const res = await handler({
      ...baseEvent,
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'Hunt', minTeamSize: 1, maxTeamSize: 5, allowSolo: true }),
    });
    expect(res.statusCode).toBe(201);
  });

  it('lists hunts', async () => {
    listHuntsMock.mockResolvedValueOnce([{ huntId: 'h1' }]);
    const res = await handler({ ...baseEvent, httpMethod: 'GET' });
    expect(res.statusCode).toBe(200);
  });

  it('gets hunt by id enforcing owner', async () => {
    getHuntMock.mockResolvedValueOnce({ huntId: 'h1', ownerId: 'user-1' });
    const res = await handler({
      ...baseEvent,
      resource: '/hunts/{id}',
      path: '/hunts/h1',
      pathParameters: { id: 'h1' },
      httpMethod: 'GET',
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 403 when not owner', async () => {
    getHuntMock.mockResolvedValueOnce({ huntId: 'h1', ownerId: 'other' });
    const res = await handler({
      ...baseEvent,
      resource: '/hunts/{id}',
      path: '/hunts/h1',
      pathParameters: { id: 'h1' },
      httpMethod: 'GET',
    });
    expect(res.statusCode).toBe(403);
  });

  it('patches hunt', async () => {
    getHuntMock.mockResolvedValueOnce({ huntId: 'h1', ownerId: 'user-1' });
    updateHuntMock.mockResolvedValueOnce({ huntId: 'h1', name: 'New' });
    const res = await handler({
      ...baseEvent,
      resource: '/hunts/{id}',
      path: '/hunts/h1',
      pathParameters: { id: 'h1' },
      httpMethod: 'PATCH',
      body: JSON.stringify({ name: 'New' }),
    });
    expect(res.statusCode).toBe(200);
  });
});
import type { APIGatewayProxyEvent } from 'aws-lambda';
