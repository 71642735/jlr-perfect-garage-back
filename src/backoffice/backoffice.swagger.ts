import { getResponses } from '@/utils/utils.swagger';

export const backofficePaths = {
  '/api/v1/backoffice/user': {
    get: {
      tags: ['Backoffice'],
      security: [{ bearerAuth: [] }],
      summary: 'Get user info',
      responses: {
        200: {
          description: 'User info',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserInfoResponse',
              },
            },
          },
        },
        ...getResponses([204, 401, 422, 500]),
      },
    },
    patch: {
      tags: ['Backoffice'],
      security: [{ bearerAuth: [] }],
      summary: 'Get user info ',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                lang: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User info',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string',
                  },
                  refresh_token: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        ...getResponses([204, 401, 422, 500]),
      },
    },
  },
  '/api/v1/backoffice/client': {
    post: {
      tags: ['Backoffice'],
      security: [{ bearerAuth: [] }],
      summary: 'Create client',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ClientRequest',
            },
          },
        },
      },
      responses: {
        201: { description: 'Client created' },
      },
      ...getResponses([401, 422, 500]),
    },
  },
  '/api/v1/backoffice/client/{clientId}': {
    put: {
      tags: ['Backoffice'],
      security: [{ bearerAuth: [] }],
      summary: 'Update client',
      parameters: [
        {
          in: 'path',
          name: 'clientId',
          required: true,
          schema: {
            type: 'integer',
            example: 1,
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ClientRequest',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Client updated',
        },
        ...getResponses([401, 422, 500]),
      },
    },
  },
};

export const backofficeComponents = {
  schemas: {
    ClientRequest: {
      type: 'object',
      required: ['first_name', 'last_name', 'email', 'phone'],
      properties: {
        first_name: {
          type: 'string',
          example: 'Carlos',
        },
        last_name: {
          type: 'string',
          example: 'Lopez',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'carlos@test.com',
        },
        phone: {
          type: 'string',
          example: '600000001',
        },
      },
    },

    UserInfoResponse: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: '11111',
        },
        first_name: {
          type: 'string',
          example: 'Juan',
        },
        last_name: {
          type: 'string',
          example: 'Gutierrez',
        },
        email: {
          type: 'string',
          example: 'juan@test.com',
        },
        preferred_language: {
          type: 'string',
          example: 'es',
        },
        retailer: {
          $ref: '#/components/schemas/Retailer',
        },
        client: {
          type: 'array',
          nullable: true,
          items: {
            $ref: '#/components/schemas/Client',
          },
        },
      },
    },

    Retailer: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'number',
          example: 1,
        },
        name: {
          type: 'string',
          example: 'Retail Madrid',
        },
        area_code: {
          type: 'string',
          example: 'ES',
        },
      },
    },

    Client: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          example: 1,
        },
        first_name: {
          type: 'string',
          example: 'Carlos',
        },
        last_name: {
          type: 'string',
          example: 'Lopez',
        },
        email: {
          type: 'string',
          example: 'carlos@test.com',
        },
        phone: {
          type: 'string',
          example: '600000001',
        },
        created: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z',
        },
        referee: {
          type: 'array',
          nullable: true,
          items: {
            $ref: '#/components/schemas/Referee',
          },
        },
      },
    },

    Referee: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          example: 10,
        },
        first_name: {
          type: 'string',
          example: 'Pedro',
        },
        last_name: {
          type: 'string',
          example: 'Martinez',
        },
        email: {
          type: 'string',
          example: 'pedro@test.com',
        },
        phone: {
          type: 'string',
          example: '600000010',
        },
        created: {
          type: 'string',
          format: 'date-time',
          example: '2024-02-01T00:00:00.000Z',
        },
        voucher_number: {
          type: 'string',
          nullable: true,
          example: 'ABC123',
        },
      },
    },
  },
};
