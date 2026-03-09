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
}
export default DatabaseBackoffice;
