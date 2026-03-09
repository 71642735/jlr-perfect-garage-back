import dotenv from 'dotenv';
import { CustomError } from '@/utils/utils.custom.error';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { IUser } from './interfaces/auth.iuser';
import { userAuthMapper } from './auth.mapper';
import { logInfo, logError } from '@/utils/utils.logger';
import DatabaseAuth from './auth.database';
import { format } from 'date-fns';
import { LOGIN_STATUS } from '@/config/config.status';
import { pool } from '@/config/config.db';
import { Database } from '@/utils/utils.database';
import { create2FAToken, createLoginToken, createToken, generateAndInsertCode, hashCode } from '@/utils/utils.auth';
import { stringToBoolean } from '@/utils/utils.common';
import {
  authenticate,
  createEvent2FA,
  createEventData,
  getSFMCConfiguration,
  getSFMCCredentials,
  sendDataToDataExtension,
  SFMCConfiguration,
  SFMCCredentials,
} from '@/utils/utils.salesforce';
import { PoolConnection } from 'mysql2/promise';

dotenv.config();
const databaseAuth = new DatabaseAuth();
const databaseUtils = new Database();

const USER_MAX_FAILS = parseInt(process.env.USER_MAX_FAILS || '5');
const LOCK_MIN = parseInt(process.env.LOCK_MIN || '10');
const TWOFA_JWT_PWD = process.env.TWOFA_JWT_PWD || '';
const WINDOW_MIN = parseInt(process.env.WINDOW_MIN || '10');
const SEND_COOLDOWN_SEC = 60;
const SEND_MAX_HOURLY = 5;
const SEND_LOCK_MIN = 10;

export const loginService = async (
  email: string,
  password: string
): Promise<{ token: string; refresh_token: string }> => {
  let connection;
  let token;
  let refresh_token;
  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);

    const userData = await databaseAuth.getAuthInfoByEmail(connection, email);
    if (!userData) {
      throw new Error('User not found');
    }

    const user: IUser = await userAuthMapper(userData);

    switch (user.status) {
      case LOGIN_STATUS.blocked:
        throw new CustomError('User blocked. Reset your password.', 1);
    }

    if (!user.id || !user.password) {
      throw new Error('Invalid user data');
    }

    if (!compareSync(password, user.password)) {
      await handleFailedLogin(user);
      throw new Error('Invalid password');
    }

    if (LOGIN_STATUS.no_active) {
      await databaseAuth.updateStatusUser(connection, user.id, LOGIN_STATUS.ready);
    }
    await databaseAuth.resetFailedLoginAttempts(connection, user.id);

    token = await twoFAProcess(connection, user);

    await databaseUtils.commit(connection);
    return { token, refresh_token };
  } catch (error) {
    logError.error(`Error login for user: ${email}. Error: ${error}`);
    if (connection) {
      await databaseUtils.rollback(connection);
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const twoFAProcess = async (connection: PoolConnection, user: IUser): Promise<string> => {
  try {
    await performFACodeSends(connection, user);
    const code = await generateAndInsertCode(connection, user.id);
    console.log(code);

    const sfmcEvents: SFMCConfiguration = await getSFMCConfiguration(connection, user.areaCode);
    const sfmcCredentials: SFMCCredentials = await getSFMCCredentials(user.areaCode);

    const eventData = await createEvent2FA({
      eventDefinitionKey: sfmcEvents.apiEvent2fa,
      userId: user.id,
      name: '',
      lastName: '',
      email: user.email,
      language: user.lang,
      authenticationCode: code,
      country: user.areaCode,
      timestamp: format(new Date(), 'd MMMM yyyy HH:mm'),
    });

    const tokenSFMC = await authenticate(
      sfmcCredentials.clientId,
      sfmcCredentials.clientSecret,
      process.env.SFMC_AUTHENTICATION_URI
    );

    const sendEmail = await sendDataToDataExtension(
      tokenSFMC,
      process.env.SFMC_REST_API_POST_EVENTS_URI ?? '',
      eventData
    );

    logInfo.info('Succesfuly data send to SFMC' + sendEmail);

    const token = await create2FAToken(user.id, '10m', TWOFA_JWT_PWD);
    console.log('token ' + token);
    return token;
  } catch (error) {
    throw error;
  }
};

const performFACodeSends = async (connection: PoolConnection, user: IUser): Promise<void> => {
  try {
    if (user.twofaSendLockUntil && new Date(user.twofaSendLockUntil) > new Date()) {
      throw new CustomError('Too many code requests. Try again later.', 429);
    }

    const underCooldown =
      user.lastTwofaSendAt && new Date(user.lastTwofaSendAt) > new Date(Date.now() - SEND_COOLDOWN_SEC * 1000);
    if (underCooldown) {
      throw new CustomError('Please wait before requesting another code.', 429);
    }

    const inHourWindow: boolean =
      user.twofaSendFirstAt && new Date(user.twofaSendFirstAt) > new Date(Date.now() - 60 * 60 * 1000);
    const nextCount: number = inHourWindow ? (user.twofaSendCount ?? 0) + 1 : 1;
    const nextFirst: Date = inHourWindow ? new Date(user.twofaSendFirstAt) : new Date();

    if (nextCount > SEND_MAX_HOURLY) {
      await databaseAuth.blockCodeSends(connection, user.id, SEND_LOCK_MIN, nextCount, nextFirst);
      throw new CustomError('Too many code requests. Try again later.', 429);
    }

    await databaseAuth.updateCountCodeSends(connection, user.id);
  } catch (error) {
    logError.error('performFACodeSends failed', {
      userId: user.id,
      error,
    });
    throw error;
  }
};

export const checkCodeService = async (
  user: IUser,
  code: string
): Promise<{ token: string; refresh_token: string }> => {
  let connection: PoolConnection | undefined;
  let committed = false;

  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);

    //checkUser2FABlocked;
    const lockUntil = user.twofaLockUntil as Date | string | null;
    if (lockUntil && new Date(lockUntil) > new Date()) {
      throw new CustomError('2FA blocked. Try again later.', 429);
    }

    const codeHash = hashCode(user.id, code);
    const codeValid = await databaseAuth.checkCode2FA(connection, user.id, codeHash);

    if (codeValid) {
      await databaseAuth.reset2FA(connection, user.id);
      const token = await createLoginToken(user, '5m', process.env.JWT_PWD!);
      const refresh_token = await createLoginToken(user, '15m', process.env.REFRESH_JWT_PWD!);
      await databaseUtils.commit(connection);
      committed = true;
      return { token, refresh_token };
    }

    const { nextCount, nextFirst } = await databaseAuth.calculateNext2faFailWindowTyped(
      connection,
      user.id,
      WINDOW_MIN
    );

    const willBlock = nextCount >= USER_MAX_FAILS;

    await databaseAuth.updateAndBlockUser(connection, user.id, nextCount, nextFirst, USER_MAX_FAILS, LOCK_MIN);

    await databaseUtils.commit(connection);
    committed = true;

    if (willBlock) {
      throw new CustomError('2FA blocked. Try again later.', 429);
    } else {
      throw new CustomError('Invalid 2FA code.', 400);
    }
  } catch (err) {
    if (connection && !committed) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const resendCodeService = async (user: IUser): Promise<{ token: string }> => {
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);
    const token = await twoFAProcess(connection, user);
    await databaseUtils.commit(connection);
    return { token };
  } catch (error) {
    logError.error('Error in resendCodeService for userID: ' + user.id + error);
    if (connection) {
      await databaseUtils.rollback(connection);
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const handleFailedLogin = async (user: IUser) => {
  await databaseAuth.incrementFailedLoginAttempts(pool, user.id);

  if (++user.failedLoginAttempts >= 3) {
    await databaseAuth.updateStatusUser(pool, user.id, LOGIN_STATUS.blocked);
    const error = new CustomError('User blocked. Reset your password.', 1);
    logInfo.info('handleFailedLogin', error);
    throw error;
  }
};

export const updateTokenService = async (user: IUser) => {
  try {
    const token = await createLoginToken(user, '5m', process.env.JWT_PWD ?? '');
    const refresh_token = await createLoginToken(user, '25m', process.env.REFRESH_JWT_PWD ?? '');

    return { token, refresh_token };
  } catch (error) {
    logError.error('Error in service updating password:' + user.email + ' Error:' + error);
    throw error;
  }
};

export const createPasswordService = async (user: IUser, newPassword: string): Promise<void> => {
  let connection;

  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);
    await databaseAuth.getAuthInfoById(connection, user.id);
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(newPassword, salt);

    await databaseAuth.updatePassword(connection, user.id, hashedPassword);

    await databaseAuth.reset2FAAll(connection, user.id);

    await databaseUtils.commit(connection);
    return;
  } catch (error) {
    logError.error('Error in service createPasswordService: ' + error);
    if (connection) {
      await databaseUtils.rollback(connection);
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const getBlackListAccessService = async (): Promise<string[]> => {
  const valuesList: string[] = [];
  try {
    const data = await databaseAuth.getBlackListAccess(pool);

    if (data) {
      for (const row of data) {
        const { id, email, token, reset_token, refresh_token, consents_token } = row;

        if (id) {
          valuesList.push(id);
        }
        if (email) {
          valuesList.push(email);
        }
        if (token) {
          valuesList.push(token);
        }
        if (reset_token) {
          valuesList.push(reset_token);
        }
        if (refresh_token) {
          valuesList.push(refresh_token);
        }
        if (consents_token) {
          valuesList.push(consents_token);
        }
      }
    }

    return valuesList;
  } catch (error) {
    logError.error('Error in getBlackListAccessService:' + error);
    throw error;
  }
};

export const forgotPasswordService = async (email: string, sendEmail: boolean): Promise<string> => {
  let connection;

  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);
    const userData = await databaseAuth.getAuthInfoByEmail(connection, email);
    if (userData) {
      const user: IUser = await userAuthMapper(userData);

      if (user.status === LOGIN_STATUS.exited) {
        return '';
      }

      const token = await generateResetToken(user.id, user.lang);

      const sfmcEvents: SFMCConfiguration = await getSFMCConfiguration(connection, user.areaCode);
      const sfmcCredentials: SFMCCredentials = await getSFMCCredentials(user.areaCode);

      await databaseUtils.commit(connection);

      const eventData = await createEventData({
        action: 'Forgot password',
        eventDefinitionKey: sfmcEvents.apiEventResetPassword ?? '',
        userId: user.id,
        name: '',
        lastName: '',
        email: user.email,
        language: user.lang,
        cta: process.env.URL_RESET_PASSWORD + '/' + token,
        country: user.areaCode,
        timestamp: format(new Date(), 'd MMMM yyyy HH:mm'),
        faqUrl: 'TODO', //urlFaq,
        tcUrl: 'TODO', //urlTC,
      });

      if (sendEmail && stringToBoolean(process.env.SEND_EMAILS)) {
        const tokenSFMC = await authenticate(
          sfmcCredentials.clientId,
          sfmcCredentials.clientSecret,
          process.env.SFMC_AUTHENTICATION_URI
        );

        const sendEmail = await sendDataToDataExtension(
          tokenSFMC,
          process.env.SFMC_REST_API_POST_EVENTS_URI ?? '',
          eventData
        );

        logInfo.info('Succesfuly data send to SFMC' + sendEmail);
        console.log(process.env.URL_RESET_PASSWORD + '/' + token);
      }
    }
    return '';
  } catch (error) {
    logError.error(`Error in forgotPasswordService: ${error}`);
    if (connection) {
      await databaseUtils.rollback(connection);
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const generateResetToken = async (userId: string, language: string): Promise<string> => {
  return await createToken(
    userId,
    language,
    '',
    '',
    process.env.FORGOT_PASSWORD_JWT_TIME ?? '1d',
    process.env.RESET_JWT_PWD ?? ''
  );
};
