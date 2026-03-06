import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { pool } from '@/config/config.db';
import { Request } from 'express';
import { getBlackListAccessService } from '@/auth/auth.service';
import { IUser } from '@/auth/interfaces/auth.iuser';
import { logError, logInfo } from '@/utils/utils.logger';

import DatabaseAuth from '@/auth/auth.database';
import dotenv from 'dotenv';

dotenv.config();

const databaseAuth = new DatabaseAuth();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.REFRESH_JWT_PWD ?? '',
  passReqToCallback: true,
};

export default new Strategy(opts, async (req: Request, payload, done) => {
  try {
    if (req.headers.authorization) {
      const requestToken = req.headers.authorization.replace('Bearer ', '');

      const dataUser = (await databaseAuth.getAuthInfoById(pool, payload.id)) as IUser;

      const blacklist = await getBlackListAccessService();

      if (!blacklist.includes(dataUser.id) && !blacklist.includes(requestToken)) {
        return done(null, dataUser);
      }
    }

    logInfo.info(
      'User not have authorization with valid refresh token or maybe user is in blacklist table:: ' + payload.id
    );
    return done(null, false);
  } catch (error) {
    logError.error(
      'Unexpected error User is unathorized when checking de refresh token  : ' + payload.id + ' error ' + error
    );
  }
});
