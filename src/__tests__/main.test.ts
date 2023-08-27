import { describe, expect, it } from 'bun:test';
import app from '..';

describe('my first test', () => {
  it('should return a 200 response', async () => {
    const req = new Request('http://localhost/');
    const res = await app.request(req);
    expect(res.status).toBe(200);
  });
});
