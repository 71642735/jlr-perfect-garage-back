import { pool } from '@/config/config.db';
import { logError } from '@/utils/utils.logger';
import DatabaseBackoffice from './backoffice..database';

const databaseBackoffice = new DatabaseBackoffice();

export const patchUserService = async (id: string, lang: string): Promise<void> => {
  try {
    await databaseBackoffice.updateUserPreferredLanguage(pool, id, lang);
    return;
  } catch (error) {
    logError.error('Error in patchUserService for userID: ' + id + ' Error: ' + error);
    throw error;
  }
};
