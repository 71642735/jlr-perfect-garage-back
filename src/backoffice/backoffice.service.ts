import { pool } from '@/config/config.db';
import { logError } from '@/utils/utils.logger';
import DatabaseBackoffice from './backoffice.database';
import { IUser } from '@/auth/interfaces/auth.iuser';
import { Database } from '@/utils/utils.database';
import { mapUserInfoResponse } from './backoffice..mapper';
import { UserInfoResponse } from './interfaces/backoffice.IUserInfoResponse';

const databaseBackoffice = new DatabaseBackoffice();
const databaseUtils = new Database();

export const patchUserService = async (id: string, lang: string): Promise<void> => {
  try {
    await databaseBackoffice.updateUserPreferredLanguage(pool, id, lang);
    return;
  } catch (error) {
    logError.error('Error in patchUserService for userID: ' + id + ' Error: ' + error);
    throw error;
  }
};

export const getUserData = async (user: IUser): Promise<UserInfoResponse | null> => {
  let connection;
  try {
    connection = await pool.getConnection();
    await databaseUtils.beginTransaction(connection);
    const dbUserData = await databaseBackoffice.getUserInfo(connection, user.id);
    if (dbUserData == null) {
      return null;
    }
    const userInfo = mapUserInfoResponse(dbUserData);
    await databaseUtils.commit(connection);
    return userInfo;
  } catch (error) {
    logError.error(`Error in getUserData for user: ${user.id}. Error: ${error}`);
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
