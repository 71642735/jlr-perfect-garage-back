import request from 'supertest';
import app from '../test.app';

describe('Auth API', () => {
  it('should respond 404 for unknown route', async () => {
    const res = await request(app).get('/route-that-does-not-exist');

    expect(res.status).toBe(404);
  });
});
