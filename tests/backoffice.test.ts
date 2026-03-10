import request from 'supertest';

// Mocks compartidos de los métodos de la "BD"
const mockGetUserInfo = jest.fn();
const mockUpdateUserPreferredLanguage = jest.fn();
const mockGetClientsInfo = jest.fn();

// Mock del pool y de la conexión para que no se abra MySQL real
const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  getConnection: jest.fn().mockResolvedValue(mockConnection),
  execute: jest.fn(),
  end: jest.fn(),
};

jest.mock('@/config/config.db', () => ({
  __esModule: true,
  pool: mockPool,
}));

// Mock de passport
jest.mock('passport', () => ({
  __esModule: true,
  default: {
    initialize: () => (_req: any, _res: any, next: any) => next(),
    authenticate: () => (req: any, res: any, next: any) => {
      const testUserId = req.headers['x-test-user-id'] as string | undefined;

      if (!testUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.user = {
        id: testUserId,
      };

      next();
    },
    use: jest.fn(),
  },
}));

// Mock de la clase DatabaseBackoffice
jest.mock('@/backoffice/backoffice.database', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getUserInfo: mockGetUserInfo,
    updateUserPreferredLanguage: mockUpdateUserPreferredLanguage,
    getRetailerClientsByUserCode: mockGetClientsInfo,
  })),
}));

import app from '../test.app';

describe('Backoffice endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/backoffice/user', () => {
    it('should return 204 when user does not exist', async () => {
      mockGetUserInfo.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/backoffice/user').set('x-test-user-id', '2222');

      expect(res.status).toBe(204);
    });

    it('should return 200 and user info when request is valid and has clients from different users of same retailer', async () => {
      mockGetUserInfo.mockResolvedValue({
        user_code: '11111',
        email: 'juan@test.com',
        first_name: 'Juan',
        last_name: 'Gutierrez',
        preferred_language: 'es',
        retailer_id: '1',
        retailer_name: 'Retail Madrid',
        retailer_area_code: 'ES',
      });

      mockGetClientsInfo.mockResolvedValue([
        {
          client_id: 1,
          client_name: 'Carlos',
          client_lastname: 'Lopez',
          client_email: 'carlos@test.com',
          //  client_phone: '600000001',
          client_created: new Date('2024-01-01'),

          referee_id: 10,
          referee_name: 'Pedro',
          referee_lastname: 'Martinez',
          referee_email: 'pedro@test.com',
          referee_phone: '600000010',
          referee_created: new Date('2024-02-01'),
          voucher_number: 'ABC123',
        },
        {
          client_id: 2,
          client_name: 'Maria',
          client_lastname: 'Garcia',
          client_email: 'maria@test.com',
          //client_phone: '600000002',
          client_created: new Date('2024-03-01'),
          referee_id: null,
        },
      ]);

      const res = await request(app).get('/api/v1/backoffice/user').set('x-test-user-id', '11111');

      expect(res.status).toBe(200);

      expect(res.body).toEqual({
        id: '11111',
        email: 'juan@test.com',
        name: 'Juan',
        last_name: 'Gutierrez',
        preferred_language: 'es',
        retailer: {
          id: '1',
          name: 'Retail Madrid',
          area_code: 'ES',
        },
        clients: [
          {
            id: 1,
            name: 'Carlos',
            last_name: 'Lopez',
            email: 'carlos@test.com',
            //  phone: '600000001',
            created: new Date('2024-01-01').toISOString(),
            referees: [
              {
                id: 10,
                name: 'Pedro',
                last_name: 'Martinez',
                email: 'pedro@test.com',
                phone: '600000010',
                created: new Date('2024-02-01').toISOString(),
                voucher_number: 'ABC123',
              },
            ],
          },
          {
            id: 2,
            name: 'Maria',
            last_name: 'Garcia',
            email: 'maria@test.com',
            //phone: '600000002',
            created: new Date('2024-03-01').toISOString(),
            referees: [],
          },
        ],
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const res = await request(app).get('/api/v1/backoffice/user');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/backoffice/user', () => {
    it('should return 200 and updated user info when lang is valid', async () => {
      mockUpdateUserPreferredLanguage.mockResolvedValue(undefined);
      mockGetUserInfo.mockResolvedValue({
        user_code: '11111',
        email: 'juan@test.com',
        first_name: 'Juan',
        last_name: 'Gutierrez',
        preferred_language: 'es',
        retailer_id: '1',
        retailer_name: 'Retail Madrid',
        retailer_area_code: 'MAD',
      });

      const res = await request(app)
        .patch('/api/v1/backoffice/user')
        .set('x-test-user-id', '11111')
        .send({ lang: 'es' });

      expect(res.status).toBe(200);
    });

    it('should return 422 when lang is missing', async () => {
      const res = await request(app).patch('/api/v1/backoffice/user').set('x-test-user-id', '11111').send({});
      expect(res.status).toBe(422);
    });
    it('should return 401 when user is not authenticated', async () => {
      const res = await request(app).patch('/api/v1/backoffice/user').send({});
      expect(res.status).toBe(401);
    });

    it('should return 422 when lang is invalid type', async () => {
      const res = await request(app)
        .patch('/api/v1/backoffice/user')
        .set('x-test-user-id', '11111')
        .send({ lang: 123 });
      expect(res.status).toBe(422);
    });
  });
});
