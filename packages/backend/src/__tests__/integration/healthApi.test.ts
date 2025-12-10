/**
 * Integration test that calls the deployed API Gateway /health endpoint when
 * SCAVENGER_API_BASE_URL is set. Skips otherwise to keep local runs fast.
 */

describe('deployed health api', () => {
  const baseUrl = process.env.SCAVENGER_API_BASE_URL;

  const buildUrl = () => {
    if (!baseUrl) return null;
    const trimmed = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${trimmed}health`;
  };

  const url = buildUrl();

  (url ? it : it.skip)('responds with ok payload', async () => {
    const response = await fetch(url!);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBeDefined();
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });
});
