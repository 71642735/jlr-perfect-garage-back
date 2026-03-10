import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import RoutesAuth from '@/auth/auth.routes';
import RoutesBackoffice from '@/backoffice/backoffice.routes';

import passport from 'passport';
import morgan from 'morgan';
import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';
import { logInfo } from '@/utils/utils.logger';
import { swaggerDocument } from '../../swaggerOptions';

import validateToken from '@/middleware/middleware.passport.jwt';
import validateRefreshToken from '@/middleware/middleware.passport.jwt-refresh';
import validateResetToken from '@/middleware/middleware-passport.jwt-reset';
import validate2FA from '@/middleware/middleware.passport.jwt-2fa';

const noCache = (req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

class Server {
  private readonly app: Application;
  private readonly port: string;

  private readonly apiPaths = {
    auth: '/api/v1/auth',
    backoffice: '/api/v1/backoffice',
  };

  constructor() {
    this.app = express();

    const allowedOrigins = (process.env.FRONT_SERVER_PORT ?? '').split(',').map((o) => o.trim());

    this.app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
      })
    );

    this.port = process.env.SERVER_PORT ?? '3000';

    this.app.disable('X-Powered-By');

    this.middlewares();
    this.routes();

    // Swagger solo fuera de tests
    if (process.env.NODE_ENV !== 'test') {
      this.app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
    }

    logInfo.info('CORS permitido:', allowedOrigins);
  }

  middlewares() {
    this.app.use(express.json());

    // Evitamos logs HTTP en tests
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('dev'));
    }

    this.app.use(noCache);
    this.app.set('etag', false);
    this.app.use(helmet());

    this.app.use(passport.initialize());

    // Registramos estrategias SOLO fuera de test
    if (process.env.NODE_ENV !== 'test') {
      passport.use(validateToken);
      passport.use('refresh-token', validateRefreshToken);
      passport.use('reset-password', validateResetToken);
      passport.use('validate2FA', validate2FA);
    }
  }

  routes() {
    this.app.use(this.apiPaths.auth, RoutesAuth);
    this.app.use(this.apiPaths.backoffice, RoutesBackoffice);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('Server running on port:' + this.port);
      logInfo.info('Server running on port:' + this.port);
    });
  }

  getApp(): Application {
    return this.app;
  }
}

export default Server;
