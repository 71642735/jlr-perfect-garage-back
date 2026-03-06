import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { pool } from '@/config/config.db';
import { IUser } from '@/auth/interfaces/auth.iuser';
import { Request } from 'express';
import { getBlackListAccessService } from '@/auth/auth.service';
import { logError, logInfo } from '@/utils/utils.logger';
import DatabaseAuth from '@/auth/auth.database';
import dotenv from 'dotenv';

dotenv.config();

const databaseAuth = new DatabaseAuth();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.TWOFA_JWT_PWD ?? '',
  passReqToCallback: true,
};

export default new Strategy(opts, async (req: Request, payload, done) => {
  try {
    if (req.headers.authorization) {
      const requestToken = req.headers.authorization.replace('Bearer ', '');

      const dataUser = await databaseAuth.getAuthInfoById(pool, payload.id);

      if (dataUser != null) {
        const iUser: IUser = {
          ...dataUser,
          managed_countries: dataUser.managed_countries
            ? dataUser.managed_countries.split(',').map((c: string) => c.trim())
            : [],
          id: dataUser.id,
          email: dataUser.email,
          role: dataUser.role,
          status: dataUser.status,
          failed_login_attempts: 0,
        };

        const blacklist = await getBlackListAccessService();

        if (!blacklist.includes(iUser.id) && !blacklist.includes(requestToken)) {
          return done(null, iUser);
        }
      }
    }

    logInfo.info(
      'User is unathorized because no authorization token for login or maybe the user is in black list : ' + payload.id
    );
    return done(null, false);
  } catch (error) {
    logError.error(
      'Unexpected error checking token for login. User is unathorized : ' + payload.id + ' error ' + error
    );
    return done(null, false);
  }
});
