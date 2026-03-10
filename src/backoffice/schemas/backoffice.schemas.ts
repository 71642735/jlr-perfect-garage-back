import Joi from 'joi';

export const SchemasBackoffice = {
  patchUser: Joi.object({
    lang: Joi.string().trim().required(),
  }),
};
