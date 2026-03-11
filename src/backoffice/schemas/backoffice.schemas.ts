import Joi from 'joi';

export const SchemasBackoffice = {
  patchUser: Joi.object({
    lang: Joi.string().trim().required(),
  }),

  createUpdateClient: Joi.object({
    first_name: Joi.string().trim().required(),
    last_name: Joi.string().trim().required(),
    email: Joi.string().trim().email().required(),
    phone: Joi.string().trim().required(),
  }),
};
