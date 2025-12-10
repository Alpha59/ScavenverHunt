import { handler } from '../healthHandler';

describe('health lambda handler', () => {
  it('returns a 200 with expected shape', async () => {
    const response = await handler({} as never, {} as never, null as never);

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected a response from handler');
    }
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('backend-lambda');
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });
});
