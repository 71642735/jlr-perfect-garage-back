import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { pool } from '@/config/config.db';
import { Request } from 'express';
import { getBlackListAccessService } from '@/auth/auth.service';
import { IUser } from '@/auth/interfaces/auth.iuser';
import { userAuthMapper } from '@/auth/auth.mapper';
import { logError, logInfo } from '@/utils/utils.logger';
import DatabaseAuth from '@/auth/auth.database';
import dotenv from 'dotenv';

dotenv.config();

const databaseAuth = new DatabaseAuth();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.RESET_JWT_PWD ?? '',
  passReqToCallback: true,
};

export default new Strategy(opts, async (req: Request, payload, done) => {
  try {
    if (req.headers.authorization) {
      const requestToken = req.headers.authorization.replace('Bearer ', '');

      if (payload.id) {
        const dataUser = await databaseAuth.getAuthInfoById(pool, payload.id);

        if (dataUser != null) {
          const user: IUser = await userAuthMapper(dataUser);

          const blacklist = await getBlackListAccessService();

          if (user.id != undefined && !blacklist.includes(user.id) && !blacklist.includes(requestToken)) {
            return done(null, dataUser);
          }
        }
      }
    }

    logInfo.info(
      'No authorization header in request with reset token or maybe user is in blacklist table: ' + payload.id
    );
    return done(null, false);
  } catch (error) {
    logError.error('Unexpected error checking reset token. User is unathorized : ' + payload.id + ' error ' + error);
  }
});
