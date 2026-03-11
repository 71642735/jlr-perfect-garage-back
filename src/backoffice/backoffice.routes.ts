import { Router } from 'express';
import passport from 'passport';
import {
  createClientController,
  getInfoUserController,
  patchUserController,
  updateClientController,
} from './backoffice.controller';
import { validateJoi } from '@/middleware/middleware.joi.validation';
import { SchemasBackoffice } from './schemas/backoffice.schemas';

const backofficeRouter = Router();

backofficeRouter.get('/user', passport.authenticate('jwt', { session: false }), getInfoUserController);
backofficeRouter.post(
  '/client',
  passport.authenticate('jwt', { session: false }),
  validateJoi(SchemasBackoffice.createUpdateClient),
  createClientController
);
backofficeRouter.put(
  '/client/:clientId',
  passport.authenticate('jwt', { session: false }),
  validateJoi(SchemasBackoffice.createUpdateClient),
  updateClientController
);
backofficeRouter.patch(
  '/user',
  passport.authenticate('jwt', { session: false }),
  validateJoi(SchemasBackoffice.patchUser),
  patchUserController
);

export default backofficeRouter;
