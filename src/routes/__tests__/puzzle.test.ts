import { describe, expect, it } from 'bun:test';
import app from '..';

describe('/puzzle', () => {
  it('should return a 200 response for a GET request', async () => {
    const req = new Request('http://localhost/puzzle');
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });
});
