export const commonConfig = (tag: string) => ({
  tags: [tag],
  security: [{ bearerAuth: [] }],
});

export const getResponses = (codes: number[]) => {
  const responseMap = {
    200: { description: 'Successful operation' },
    201: { description: 'Successful operation' },
    204: { description: 'No content' },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
    409: { description: 'Conflict' },
    413: {
      description: 'Payload Too Large',
      content: {
        'application/json': {
          schema: { $ref: '#/components/Error413Response' },
        },
      },
    },
    422: { description: 'Unprocessable entity' },
    429: { description: 'User blocked. Retry later' },
    500: { description: 'Internal server error' },
  };
  return Object.fromEntries(codes.map((code) => [code, responseMap[code]]).filter(([code, value]) => value));
};

export const createParam = (name, location, description, type, required) => {
  return {
    name,
    in: location,
    description,
    required: required,
    schema: { type: type },
  };
};
