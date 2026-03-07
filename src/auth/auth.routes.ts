import { Router } from 'express';
import { validateJoi, validatePathParam } from '@/middleware/middleware.joi.validation';
import { SchemasAuth } from './schemas/auth.schemas';
import { login, refreshToken, createNewPassword, forgotPassword, checkCode, resendCode } from './auth.controller';
import passport from 'passport';

const authRouter = Router();

authRouter.post('/login', validateJoi(SchemasAuth.postLoginData), login);
authRouter.post(
  '/checkcode/:code',
  passport.authenticate('validate2FA', { session: false }),
  validatePathParam({ code: SchemasAuth.codePathParam }),
  checkCode
);
authRouter.post('/resend-code', passport.authenticate('validate2FA', { session: false }), resendCode);
authRouter.post('/refresh-token', passport.authenticate('refresh-token', { session: false }), refreshToken);
authRouter.put('/forgot-password/:email', validatePathParam({ email: SchemasAuth.emailPathParam }), forgotPassword);
authRouter.patch(
  '/new-password',
  validateJoi(SchemasAuth.patchPassword),
  passport.authenticate('reset-password', { session: false }),
  createNewPassword
);

export default authRouter;
