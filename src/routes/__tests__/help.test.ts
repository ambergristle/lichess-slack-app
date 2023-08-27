import { describe, expect, it } from 'bun:test';
import app from '..';

describe('/help', () => {
  it('should return a 200 response for a GET request', async () => {
    const req = new Request('http://localhost/help');
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });
});
