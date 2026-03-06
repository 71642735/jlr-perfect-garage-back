import jwt from 'jsonwebtoken';
import { IUser } from '@/auth/interfaces/auth.iuser';
import crypto from 'crypto';
import { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { logError, logInfo } from './utils.logger';

const createToken = async (
  userId: string,
  language: string,
  country: string,
  role: string,
  time: string,
  secretJwt: string
): Promise<string> => {
  const token = jwt.sign({ id: userId, language: language, country: country, role: role }, secretJwt, {
    expiresIn: time,
  });

  return token;
};

const createLoginToken = async (user: IUser, time: string, secretJwt: string): Promise<string> => {
  const token = jwt.sign({ id: user.id, role: user.role, user: user.email.split('@')[0] }, secretJwt, {
    expiresIn: time,
  });

  return token;
};

const create2FAToken = async (id: string, time: string, secretJwt: string): Promise<string> => {
  const token = jwt.sign({ id: id }, secretJwt, {
    expiresIn: time,
  });

  return token;
};

const generateCode = async (connection: PoolConnection, userId: string): Promise<string> => {
  const numero = crypto.randomInt(0, 1_000_000);
  const codeString = numero.toString().padStart(6, '0');
  const code = hashCode(userId, codeString);
  await insertTwoFa(connection, userId, code);
  return codeString;
};

const hashCode = (userId: string, code: string): Buffer => {
  const secret = process.env.TWOFA_SECRET;
  if (!secret) {
    throw new Error('No TWOFA_SECRET configured');
  }
  return crypto.createHmac('sha256', secret).update(`${userId}:${code}`, 'utf8').digest();
};

const insertTwoFa = async (connection: PoolConnection, userId: string, code: Buffer<ArrayBufferLike>) => {
  const sql = ` UPDATE login
                SET
                  twofa_code_hash = ?,
                  twofa_created_at = NOW(),
                  twofa_expires_at = NOW() + INTERVAL 10 MINUTE,
                  twofa_used_at = NULL     
                WHERE id = ?`;
  try {
    const [result] = await connection.execute<ResultSetHeader>(sql, [code, userId]);

    if (result.affectedRows > 0) {
      logInfo.info('hascode for login updated for :' + userId);
      return;
    }

    const err = new Error('hascode for login cannot be updated at this time ' + userId);
    logError.error(err);
    throw err;
  } catch (error) {
    logError.error('Unexpected error updating hascode for login for :' + userId + 'Error: ' + error);
    throw error;
  }
};

export { createToken, createLoginToken, generateCode, create2FAToken, hashCode };
