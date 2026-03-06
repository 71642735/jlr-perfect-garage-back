import { NextFunction, Request, Response } from 'express';
import Joi, { Schema } from 'joi';

export const validateJoi = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(422).json({ errorMessage: error.message });
      }

      return res.status(422).json({ error: error });
    }
  };
};

export const validatePathParam =
  (paramSchema: { [key: string]: Joi.Schema }) => (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object(paramSchema);
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };

export const validateQueryParam = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};
