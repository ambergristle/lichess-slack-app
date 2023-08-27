import { describe, expect, it } from 'bun:test';
import app from '..';

describe('/set-time', () => {
  it('should return a 200 response for a GET request', async () => {
    const req = new Request('http://localhost/set-time');
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });
});
