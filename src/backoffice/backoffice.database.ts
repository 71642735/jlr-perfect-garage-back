import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { logInfo, logError } from '@/utils/utils.logger';
import { CustomError } from '@/utils/utils.custom.error';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseBackoffice {
  async updateUserPreferredLanguage(connection: Pool, userId: string, lang: string): Promise<void> {
    try {
      const query = 'UPDATE user SET preferred_language = ? WHERE id = ?';

      const [result] = await connection.execute<ResultSetHeader>(query, [lang, userId]);
      if (result.affectedRows > 0) {
        logInfo.info('Language updated for :' + userId);
        return;
      }

      const err = new Error('Language cannot be updated at this time ' + userId);
      logError.error(err);
      throw err;
    } catch (error) {
      logError.error('Unexpected error updating language for :' + userId + 'Error: ' + error);
      throw error;
    }
  }

  async getUserInfo(connection: PoolConnection, id: string): Promise<RowDataPacket | null> {
    let sqlQuery = `SELECT user_code, login.email, users.first_name, users.last_name, users.preferred_language , users.retailer_id, ret.name as retailer_name, ret.area_code as retailer_area_code  
                    FROM login login 
                    LEFT JOIN users users ON login.id = users.user_code 
                    LEFT JOIN retailers ret ON ret.retailer_id = users.retailer_id 
                    WHERE id = '111111' and users.active = 1 and ret.active = 1`;

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(sqlQuery, id);
      if (rows.length === 0) {
        return null;
      }
      return rows[0];
    } catch (error) {
      logError.error(`Error getUserInfo for id: ${id}`);
      throw error;
    }
  }
}
export default DatabaseBackoffice;
