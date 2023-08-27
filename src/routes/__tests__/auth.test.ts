import { describe, expect, it } from 'bun:test';
import app from '..';

describe('/auth', () => {
  it('should return a 200 response for a GET request', async () => {
    const req = new Request('http://localhost/auth');
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });

  it('should return a 405 response for invalid methods', async () => {
    const req = new Request('http://localhost/auth');
    const res = await app.request(req, { method: 'POST' });
    expect(res.status).toBe(405);
  });
});
