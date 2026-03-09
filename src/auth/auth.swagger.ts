import { commonConfig, createParam, getResponses } from '@/utils/utils.swagger';

export const authPaths = {
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Post for user log in',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User logged in successfully',
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
        ...getResponses([401, 422, 500]),
      },
    },
  },
  '/api/v1/auth/resend-code': {
    post: {
      tags: ['Auth'],
      summary: 'Post for user log in',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Successfull',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        ...getResponses([401, 422, 500]),
      },
    },
  },
  '/api/v1/auth/checkcode/{code}': {
    post: {
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      summary: 'Post for user log in',
      parameters: [createParam('code', 'path', 'CodeUser email', 'string', true)],
      responses: {
        200: {
          description: 'User logged in successfully',
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
        ...getResponses([401, 422, 429, 500]),
      },
    },
  },
  '/api/v1/auth/refresh-token': {
    post: {
      summary: 'Post for refresh token',
      ...commonConfig('Auth'),
      responses: {
        200: {
          description: 'Get a new token and new refresh token',
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
        ...getResponses([401, 500]),
      },
    },
  },
  '/api/v1/auth/new-password': {
    patch: {
      summary: 'Create new forgot password',
      ...commonConfig('Auth'),
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                password: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        ...getResponses([200, 204, 401, 422, 500]),
      },
    },
  },
  '/api/v1/auth/forgot-password/{email}': {
    put: {
      tags: ['Auth'],
      summary: 'Call to forgot password',
      parameters: [createParam('email', 'path', 'User email', 'string', true)],
      responses: {
        200: {
          description: 'Get a link for create a new password and unblock user',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                  },
                  verificationLink: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        ...getResponses([400, 422, 500]),
      },
    },
  },
};
export const authComponents = {};
