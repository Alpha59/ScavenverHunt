import { buildHealthResponse } from '../health';

describe('buildHealthResponse', () => {
  it('returns the expected shape', () => {
    const result = buildHealthResponse();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('backend');
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });
});
