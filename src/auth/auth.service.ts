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
import { create2FAToken, createLoginToken, createToken, generateCode, hashCode } from '@/utils/utils.auth';
import { stringToBoolean } from '@/utils/utils.common';
import { authenticate, createEvent2FA, createEventData, sendDataToDataExtension } from '@/utils/utils.salesforce';
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
    const user: IUser = await userAuthMapper(userData);

    if (!user) {
      throw new Error('User not found');
    }

    switch (user.status) {
      case LOGIN_STATUS.blocked:
        throw new CustomError('User blocked. Reset your password.', 1);
      case LOGIN_STATUS.exited:
        throw new CustomError('User has exit from program', 1);
      case LOGIN_STATUS.removed:
        throw new CustomError('User was inactive of program', 1);
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

    /*
    if (user.role == ROLES.FrontApp) {
      token = await createLoginToken(user, '5m', process.env.JWT_PWD ?? '');
      refresh_token = await createLoginToken(user, '15m', process.env.REFRESH_JWT_PWD ?? '');
    } else {
      token = await twoFAProcess(connection, user);
    }*/

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
    const userCountry = await databaseAuth.getAdminCountry(connection, user.id);

    await performFACodeSends(connection, user.id);

    const code = await generateCode(connection, user.id);

    console.log(code);

    const eventData = await createEvent2FA({
      eventDefinitionKey: process.env.SFMC_TWO_FACTOR_AUTH ?? '',
      userId: user.id,
      name: '',
      lastName: '',
      email: user.email,
      language: 'en',
      authenticationCode: code,
      country: userCountry?.area_code,
      timestamp: format(new Date(), 'd MMMM yyyy HH:mm'),
    });

    const tokenSFMC = await authenticate(
      process.env.SFMC_CLIENT_ID,
      process.env.SFMC_CLIENT_SECRET,
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

const performFACodeSends = async (connection: PoolConnection, userId: string): Promise<void> => {
  try {
    const userFAInfo = await databaseAuth.getUserFAInfo(connection, userId);

    if (userFAInfo.twofa_send_lock_until && new Date(userFAInfo.twofa_send_lock_until) > new Date()) {
      throw new CustomError('Too many code requests. Try again later.', 429);
    }

    const underCooldown =
      userFAInfo.last_twofa_send_at &&
      new Date(userFAInfo.last_twofa_send_at) > new Date(Date.now() - SEND_COOLDOWN_SEC * 1000);
    if (underCooldown) {
      throw new CustomError('Please wait before requesting another code.', 429);
    }

    const inHourWindow: boolean =
      userFAInfo.twofa_send_first_at &&
      new Date(userFAInfo.twofa_send_first_at) > new Date(Date.now() - 60 * 60 * 1000);
    const nextCount: number = inHourWindow ? (userFAInfo.twofa_send_count ?? 0) + 1 : 1;
    const nextFirst: Date = inHourWindow ? new Date(userFAInfo.twofa_send_first_at) : new Date();

    if (nextCount > SEND_MAX_HOURLY) {
      await databaseAuth.blockCodeSends(connection, userId, SEND_LOCK_MIN, nextCount, nextFirst);
      throw new CustomError('Too many code requests. Try again later.', 429);
    }

    await databaseAuth.updateCountCodeSends(connection, userId);
  } catch (error) {
    throw error;
  }
};

export const checkCodeService = async (
  user: IUser,
  code: string
): Promise<{ token: string; refresh_token: string }> => {
  let conn: PoolConnection | undefined;
  let committed = false;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await databaseAuth.checkUser2FABlocked(conn, user.id);

    const codeHash = hashCode(user.id, code);
    const codeValid = await databaseAuth.checkCode2FA(conn, user.id, codeHash);

    if (codeValid) {
      await databaseAuth.reset2FA(conn, user.id);
      const token = await createLoginToken(user, '5m', process.env.JWT_PWD!);
      const refresh_token = await createLoginToken(user, '15m', process.env.REFRESH_JWT_PWD!);
      await conn.commit();
      committed = true;
      return { token, refresh_token };
    }

    const { nextCount, nextFirst } = await databaseAuth.calculateNext2faFailWindowTyped(conn, user.id, WINDOW_MIN);

    const willBlock = nextCount >= USER_MAX_FAILS;

    await databaseAuth.updateAndBlockUser(conn, user.id, nextCount, nextFirst, USER_MAX_FAILS, LOCK_MIN);

    await conn.commit();
    committed = true;

    if (willBlock) {
      throw new CustomError('2FA blocked. Try again later.', 429);
    } else {
      throw new CustomError('Invalid 2FA code.', 400);
    }
  } catch (err) {
    if (conn && !committed) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

export const resendCodeService = async (user: IUser): Promise<{ token: string }> => {
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const token = await twoFAProcess(connection, user);
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

  if (++user.failed_login_attempts >= 3) {
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

export const createPasswordService = async (userId: string, newPassword: string): Promise<void> => {
  let connection;

  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);
    await databaseAuth.getAuthInfoById(connection, userId);
    const salt = genSaltSync(10);
    const hashedPassword = hashSync(newPassword, salt);

    await databaseAuth.updatePassword(connection, userId, hashedPassword);

    //await databaseAuth.updateCountCodeSends(connection, userId);
    await databaseAuth.reset2FAAll(connection, userId);

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

      const userCountry = await databaseAuth.getAdminCountry(connection, user.id);
      const token = await generateResetToken(user.id, 'en');

      const { urlTC, urlFaq, urlResetPassword } = await databaseAuth.getUrls(
        connection,
        userCountry?.area_code || '',
        ''
      );

      await databaseUtils.commit(connection);

      const eventData = await createEventData({
        action: 'Forgot password',
        eventDefinitionKey: process.env.SFMC_RESET_PASSWORD ?? '',
        userId: user.id,
        name: userData.name,
        lastName: userData.last_name,
        email: userData.email,
        language: 'en',
        cta: urlResetPassword + '/' + token,
        country: userData.country,
        timestamp: format(new Date(), 'd MMMM yyyy HH:mm'),
        faqUrl: urlFaq,
        tcUrl: urlTC,
      });

      if (sendEmail && stringToBoolean(process.env.SEND_EMAILS)) {
        const tokenSFMC = await authenticate(
          process.env.SFMC_CLIENT_ID,
          process.env.SFMC_CLIENT_SECRET,
          process.env.SFMC_AUTHENTICATION_URI
        );

        const sendEmail = await sendDataToDataExtension(
          tokenSFMC,
          process.env.SFMC_REST_API_POST_EVENTS_URI ?? '',
          eventData
        );

        logInfo.info('Succesfuly data send to SFMC' + sendEmail);
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
