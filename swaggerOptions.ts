import { authPaths, authComponents } from './src/auth/auth.swagger.js';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DEFENDER TROPHY API',
    version: '1.0.0',
    description: 'API for Defender Trophy Application',
  },
  servers: [
    {
      url: `${process.env.PROTOCOL}://${process.env.HOST}`,
    },
  ],
  paths: {
    ...authPaths,  
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    ...authComponents,
    Error413Response: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Data too long' },
        field: { type: 'string', example: 'contact_number' },
      },
    },
  },
};
