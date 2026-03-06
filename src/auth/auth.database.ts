import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { IBlackList } from './interfaces/auth.iblacklist';
import { logInfo, logError } from '@/utils/utils.logger';
import { LOGIN_STATUS } from '@/config/config.status';
import { CustomError } from '@/utils/utils.custom.error';
import dotenv from 'dotenv';

dotenv.config();

type NextWinRow = RowDataPacket & { next_count: number; next_first: Date | string };

class DatabaseAuth {
  async updatePassword(connection: Pool | PoolConnection, userId: string, hashedPassword: string): Promise<void> {
    try {
      const query = 'UPDATE login SET password = ?, failed_login_attempts = ?, status = ? WHERE id = ?';

      const [result] = await connection.execute<ResultSetHeader>(query, [
        hashedPassword,
        0,
        LOGIN_STATUS.no_active,
        userId,
      ]);
      if (result.affectedRows > 0) {
        logInfo.info('Password updated for :' + userId);
        return;
      }

      const err = new Error('Password cannot be updated at this time ' + userId);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error('Unexpected error updateing password for :' + userId + 'Error: ' + error);
      throw error;
    }
  }

  async incrementFailedLoginAttempts(connection: Pool, id: string): Promise<void> {
    try {
      const sqlQuery = 'UPDATE login SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?';
      const [result] = await connection.execute<ResultSetHeader>(sqlQuery, [id]);

      if (result.affectedRows > 0) {
        logInfo.info('Increment failed login attempts for :' + id);
        return;
      }

      const err = new Error('Cannot increment failed login attempts at this time ' + id);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error('unexpected error increment Failed Login Attempts user_id :' + id + ' Error: ' + error);
      throw error;
    }
  }

  async getAuthInfoById(connection: PoolConnection | Pool, id: string): Promise<RowDataPacket | null> {
    try {
      const query: string = `SELECT 
                                login.id,
                                login.email,
                                login.password,
                                login.role,
                                login.status,
                                login.failed_login_attempts,
                                login.last_login,
                                GROUP_CONCAT(rac.area_code SEPARATOR ', ') AS managed_countries
                            FROM login 
                            LEFT JOIN rel_admin_country rac ON rac.admin_id = login.id
                            WHERE login.id = ?
                            GROUP BY 
                                login.id,
                                login.email,
                                login.password,
                                login.role,
                                login.status,
                                login.failed_login_attempts,
                                login.last_login;`;
      const [rows] = await connection.execute<RowDataPacket[]>(query, [id]);

      if (rows.length > 0) {
        return rows[0];
      }
      throw new CustomError('User not found', 204);
    } catch (error) {
      logError.error('Error getAuthInfoById: user_id :' + id + ' Error: ' + error);
      throw error;
    }
  }

  async getAuthInfoByEmail(connection: PoolConnection, email: string): Promise<RowDataPacket | null> {
    try {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM login WHERE email = ?', [email]);

      if (rows.length > 0) {
        logInfo.info('usuario encontrado con email: ' + email);
        return rows[0];
      }
      logInfo.info('usuario no encontrado con email: ' + email);
      return null;
    } catch (error) {
      logError.error('Error getAuthInfoByEmail: user_email :' + email + ' Error: ' + error);
      throw error;
    }
  }

  async getAdminCountry(connection: PoolConnection, adminId: string): Promise<RowDataPacket | null> {
    try {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM rel_admin_country WHERE admin_id = ?', [
        adminId,
      ]);

      if (rows.length > 0) {
        return rows[0];
      }

      return null;
    } catch (error) {
      logError.error('Error getAdminCountry: id :' + adminId + ' Error: ' + error);
      throw error;
    }
  }

  async updateStatusUser(connection: Pool, userId: string, status: string): Promise<void> {
    try {
      const [rows] = await connection.execute<ResultSetHeader>('UPDATE login SET STATUS = ? WHERE id = ?', [
        status,
        userId,
      ]);
      if (rows.affectedRows > 0) {
        logInfo.info('Change status to ' + status + ' for userId: ' + userId);
        return;
      }

      const err = new Error('Cannot change status to ' + status + ' for userId: ' + userId);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error('Unexpected error change status to ' + status + 'for userId: ' + userId + ' Error ' + error);
      throw error;
    }
  }

  async resetFailedLoginAttempts(connection: Pool | PoolConnection, id: string): Promise<void> {
    try {
      const [rows] = await connection.execute<ResultSetHeader>(
        'UPDATE login SET failed_login_attempts = 0, status = "ready", last_login = NOW() WHERE id = ?',
        [id]
      );

      if (rows.affectedRows > 0) {
        logInfo.info('Reset failed login attempts for user :' + id);
        return;
      }

      const err = new Error('Cannot reset failed login attempts for user ' + id);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error(' Unexpected error resetFailedLoginAttempts user_id :' + id + ' Error: ' + error);
      throw error;
    }
  }

  async updateResetToken(connection: Pool, userEmail: string, resetToken: string): Promise<void> {
    const query = 'UPDATE login SET reset_token = ?, failed_login_attempts = 0 WHERE email = ?';

    try {
      const [rows] = await connection.execute<ResultSetHeader>(query, [resetToken, userEmail]);
      if (rows.affectedRows > 0) {
        logInfo.info('Update reset token for user :' + userEmail);
        return;
      }

      const err = new Error('Cannot update reset token at this time for user ' + userEmail);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error('unexpected error in updateResetToken user: ' + userEmail + ' Error: ' + error);
      throw error;
    }
  }

  async getBlackListAccess(connection: Pool): Promise<IBlackList[]> {
    let blackList: IBlackList[] = [];

    try {
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM black_list_access');

      if (rows.length > 0) {
        blackList = rows.map((row: RowDataPacket) => {
          return {
            id: row.id,
            email: row.email,
            token: row.token,
            reset_token: row.reset_token,
            refresh_token: row.refresh_token,
            consents_token: row.consents_token,
          };
        });
      }
      return blackList;
    } catch (error) {
      logError.error('Error getBlackListAccess: ', error);
      throw error;
    }
  }

  async deleteUserByEmail(connection: Pool, hac_email: string): Promise<boolean> {
    const sqlQuery = 'DELETE FROM login WHERE email = ?';
    try {
      const [results] = await connection.execute<ResultSetHeader>(sqlQuery, [hac_email]);
      if (results.affectedRows > 0) {
        logInfo.info('Deleted user: ' + hac_email);
        return true;
      }

      return false;
    } catch (error) {
      logError.error('Error getting deleting user: ' + hac_email + 'Error: ' + error);
      throw error;
    }
  }

  async getUrls(
    connection: PoolConnection,
    country: string,
    language: string
  ): Promise<{
    urlTC: string;
    urlFaq: string;
    urlThankYou: string;
    urlFailed: string;
    urlResetPassword: string;
    urlSuccess: string;
    urlReminder: string;
  }> {
    let sqlQuery = 'SELECT * FROM urls WHERE country = ?';
    const queryParams: any[] = [country];

    if (language !== undefined && language !== null && language.trim() !== '' && language !== 'en') {
      sqlQuery += ' AND language = ?';
      queryParams.push(language);
    }

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(sqlQuery, queryParams);

      return {
        urlTC: rows[0].terms_url,
        urlFaq: rows[0].legal_url,
        urlThankYou: rows[0].thank_you_url,
        urlFailed: rows[0].failed_url,
        urlResetPassword: rows[0].reset_password_url,
        urlSuccess: rows[0].success_url,
        urlReminder: rows[0].reminder_url,
      };
    } catch (error) {
      logError.error(`Error getUrls for country: ${country}: ${error}`);
      throw error;
    }
  }

  async checkUser2FABlocked(conn: PoolConnection, userId: string): Promise<void> {
    const sql = 'SELECT twofa_lock_until FROM login WHERE id = ? FOR UPDATE';
    const [rows] = await conn.execute<RowDataPacket[]>(sql, [userId]);
    if (rows.length === 0) {
      throw new CustomError('User not found', 404);
    }

    const lockUntil = rows[0].twofa_lock_until as Date | string | null;
    if (lockUntil && new Date(lockUntil) > new Date()) {
      throw new CustomError('2FA blocked. Try again later.', 429);
    }
  }

  async checkCode2FA(connection: PoolConnection, userId: string, codeHash: Buffer): Promise<boolean> {
    try {
      const sql = ` UPDATE login
                    SET twofa_used_at = NOW()
                    WHERE id = ?
                      AND twofa_used_at IS NULL
                      AND twofa_expires_at > NOW()
                      AND twofa_code_hash = ?
                    LIMIT 1 `;

      const [res] = await connection.execute<ResultSetHeader>(sql, [userId, codeHash]);
      return res.affectedRows === 1;
    } catch (err) {
      logError.error(`Error checkCode2FA user_id:${userId} Error: ${err}`);
      throw err;
    }
  }

  async reset2FA(conn: PoolConnection, userId: string): Promise<void> {
    await conn.execute(
      `UPDATE login
     SET twofa_fail_count = 0,
         twofa_first_fail_at = NULL,
         twofa_lock_until = NULL,
         twofa_code_hash = NULL,       
         twofa_expires_at = NULL     
     WHERE id = ?`,
      [userId]
    );
  }

  async calculateNext2faFailWindow(connection: Pool, userId: string): Promise<RowDataPacket[]> {
    try {
      const query: string = `SELECT
                              CASE
                                WHEN twofa_first_fail_at IS NULL
                                  OR twofa_first_fail_at < NOW() - INTERVAL ? MINUTE
                                THEN 1
                                ELSE twofa_fail_count + 1
                              END AS next_count,
                              CASE
                                WHEN twofa_first_fail_at IS NULL
                                  OR twofa_first_fail_at < NOW() - INTERVAL ? MINUTE
                                THEN NOW()
                                ELSE twofa_first_fail_at
                              END AS next_first
                            FROM login WHERE id = ?`;
      const [rows] = await connection.execute<RowDataPacket[]>(query, [
        parseInt(process.env.WINDOW_MIN ?? '10'),
        parseInt(process.env.WINDOW_MIN ?? '10'),
        userId,
      ]);

      return rows;
    } catch (error) {
      logError.error('Error update2FAAttempts: user_id :' + userId + ' Error: ' + error);
      throw error;
    }
  }

  async updateAndBlockUser(
    conn: PoolConnection,
    userId: string,
    nextCount: number,
    nextFirst: Date | string,
    userMaxFails: number,
    lockMin: number
  ): Promise<void> {
    const query: string = `UPDATE login
     SET twofa_fail_count = ?,
         twofa_first_fail_at = ?,
         twofa_lock_until =
           CASE WHEN ? >= ? THEN NOW() + INTERVAL ? MINUTE ELSE NULL END,
         twofa_expires_at =
           CASE WHEN ? >= ? THEN NOW() ELSE twofa_expires_at END
     WHERE id = ?`;
    await conn.execute(query, [
      nextCount,
      nextFirst,
      nextCount,
      userMaxFails,
      lockMin,
      nextCount,
      userMaxFails,
      userId,
    ]);
  }

  async calculateNext2faFailWindowTyped(
    conn: PoolConnection,
    userId: string,
    windowMin: number
  ): Promise<{ nextCount: number; nextFirst: Date | string }> {
    const query: string = `SELECT
                            CASE
                              WHEN twofa_first_fail_at IS NULL
                                OR twofa_first_fail_at < NOW() - INTERVAL ? MINUTE
                              THEN 1
                              ELSE COALESCE(twofa_fail_count, 0) + 1
                            END AS next_count,
                            CASE
                              WHEN twofa_first_fail_at IS NULL
                                OR twofa_first_fail_at < NOW() - INTERVAL ? MINUTE
                              THEN NOW()
                              ELSE twofa_first_fail_at
                            END AS next_first
                          FROM login WHERE id = ?`;
    const [rows] = await conn.execute<NextWinRow[]>(query, [windowMin, windowMin, userId]);
    return { nextCount: rows[0].next_count, nextFirst: rows[0].next_first };
  }

  async getUserFAInfo(connection: PoolConnection, userId: string): Promise<RowDataPacket> {
    const query: string = `SELECT twofa_send_lock_until, twofa_send_count, twofa_send_first_at, last_twofa_send_at
                            FROM login
                            WHERE id = ? FOR UPDATE`;
    const [rows] = await connection.execute<RowDataPacket[]>(query, [userId]);
    if (!rows.length) {
      throw new CustomError('User not found', 404);
    }
    return rows[0];
  }

  async blockCodeSends(
    connection: PoolConnection,
    userId: string,
    sendLockMin: number,
    nextCount: number,
    nextFirst: Date
  ): Promise<void> {
    const query: string = `UPDATE login
                            SET twofa_send_count = ?,
                                twofa_send_first_at = ?,
                                twofa_send_lock_until = NOW() + INTERVAL ? MINUTE
                          WHERE id = ?`;
    await connection.execute(query, [nextCount, nextFirst, sendLockMin, userId]);
    return;
  }
  async updateCountCodeSends(connection: PoolConnection, userId: string): Promise<void> {
    const query: string = `UPDATE login
                            SET twofa_send_count =
                                  CASE
                                    WHEN twofa_send_first_at IS NULL
                                        OR twofa_send_first_at < NOW() - INTERVAL 1 HOUR
                                    THEN 1
                                    ELSE COALESCE(twofa_send_count,0) + 1
                                  END,
                                twofa_send_first_at =
                                  CASE
                                    WHEN twofa_send_first_at IS NULL
                                        OR twofa_send_first_at < NOW() - INTERVAL 1 HOUR
                                    THEN NOW()
                                    ELSE twofa_send_first_at
                                  END,
                                last_twofa_send_at = NOW()
                          WHERE id = ?`;
    await connection.execute(query, [userId]);
  }

  async reset2FAAll(conn: PoolConnection, userId: string): Promise<void> {
    await conn.execute(
      `UPDATE login
      SET twofa_fail_count = 0,
          twofa_first_fail_at = NULL,
          twofa_lock_until = NULL,
          twofa_code_hash = NULL,
          twofa_expires_at = NULL,
          twofa_send_count = 0,
          twofa_send_first_at = NULL,
          twofa_send_lock_until = NULL,
          last_twofa_send_at = NULL
      WHERE id = ?`,
      [userId]
    );
  }
}
export default DatabaseAuth;
