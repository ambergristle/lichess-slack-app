import { describe, expect, it } from 'bun:test';
import app from '..';

describe('main router', () => {
  it('should return a 404 response for an unregistered route', async () => {
    const req = new Request('http://localhost/api/v1/checkers');
    const res = await app.request(req);
    expect(res.status).toBe(404);
  });
});
