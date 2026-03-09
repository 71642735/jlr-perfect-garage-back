import { Router } from 'express';
import passport from 'passport';
import { getInfoUserController, patchUserController } from './backoffice.controller';
import { validateJoi } from '@/middleware/middleware.joi.validation';
import { SchemasBackoffice } from './schemas/backoffice.schemas';

const backofficeRouter = Router();

backofficeRouter.get('/user', passport.authenticate('jwt', { session: false }), getInfoUserController);
backofficeRouter.patch(
  '/user',
  passport.authenticate('jwt', { session: false }),
  validateJoi(SchemasBackoffice.patchUser),
  patchUserController
);

export default backofficeRouter;
