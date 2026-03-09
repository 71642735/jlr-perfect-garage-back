import { getResponses } from '@/utils/utils.swagger';

export const backofficePaths = {
  '/api/v1/backoffice/user': {
    get: {
      tags: ['Backoffice'],
      security: [{ bearerAuth: [] }],
      summary: 'Get user info ',
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
};
export const backofficeComponents = {};
