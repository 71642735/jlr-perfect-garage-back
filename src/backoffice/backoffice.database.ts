import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { logInfo, logError } from '@/utils/utils.logger';
import dotenv from 'dotenv';
import { IClient } from './interfaces/backoffice.IUserInfoResponse';

dotenv.config();

class DatabaseBackoffice {
  async updateUserPreferredLanguage(connection: Pool, userId: string, lang: string): Promise<void> {
    try {
      const query = 'UPDATE users SET preferred_language = ? WHERE user_code = ?';

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
    let sqlQuery = `SELECT user_code, users.email, users.first_name, users.last_name, users.preferred_language , users.retailer_id, ret.name as retailer_name, ret.area_code as retailer_area_code  
                    FROM login login 
                    LEFT JOIN users users ON login.id = users.user_code 
                    LEFT JOIN retailers ret ON ret.retailer_id = users.retailer_id 
                    WHERE id = ? and users.active = 1 and ret.active = 1 and deleted IS NULL`;

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(sqlQuery, [id]);
      if (rows.length === 0) {
        return null;
      }
      return rows[0];
    } catch (error) {
      logError.error(`Error getUserInfo for id: ${id} error: ` + error);
      throw error;
    }
  }

  async getRetailerClientsByUserCode(connection: PoolConnection, userCode: string): Promise<RowDataPacket[] | null> {
    let sqlQuery = `SELECT
                      client.client_id, client.first_name as client_first_name, client.last_name as client_last_name, client.email as client_email,
                      client.created as client_created,
                      client.phone as client_phone,
                      ref.referee_id, ref.firstname as referee_name, ref.lastname as referee_last_name, ref.email as referee_email,
                      ref.phone as referee_phone, ref.created as referee_created, purchase.voucher_id as voucher_number
                    FROM users user
                    JOIN clients client ON client.user_id = user.user_id AND client.deleted IS NULL
                    LEFT JOIN referees ref ON ref.client_id = client.client_id AND ref.deleted IS NULL
                    LEFT JOIN purchases purchase ON purchase.referee_id = ref.referee_id AND purchase.deleted IS NULL
                    WHERE user.retailer_id = (
                                                SELECT retailer_id
                                                FROM users
                                                WHERE user_code = ?
                                                  AND deleted IS NULL 
                                                LIMIT 1
                                              )
                      AND user.deleted IS NULL
                    ORDER BY client.created;`;

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(sqlQuery, [userCode]);
      if (rows.length === 0) {
        return null;
      }
      return rows;
    } catch (error) {
      logError.error(`Error getRetailerClientsByUserCode for usercode: ${userCode} error: ` + error);
      throw error;
    }
  }

  async createClient(connection: Pool, internalUserId: number, client: IClient): Promise<void> {
    try {
      const query = `INSERT INTO clients (user_id, first_name, last_name, email, phone)
                      VALUES (?, ?, ?, ?, ?)`;

      const [result] = await connection.execute<ResultSetHeader>(query, [
        internalUserId,
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
      ]);

      logInfo.info(`Client created ${result.insertId} by userId ${internalUserId}`);
    } catch (error) {
      logError.error('Unexpected error updating language for userId :' + internalUserId + 'Error: ' + error);
      throw error;
    }
  }

  async updateClient(connection: Pool, internalUserId: number, clientId: number, client: IClient): Promise<void> {
    try {
      const query = `UPDATE clients
                      SET first_name = ?, last_name = ?, email = ?, phone = ?
                      WHERE client_id = ? AND user_id = ?`;

      await connection.execute<ResultSetHeader>(query, [
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        clientId,
        internalUserId,
      ]);

      logInfo.info(`Client updated ${clientId} by userId ${internalUserId}`);
    } catch (error) {
      logError.error('Unexpected error updating client ' + clientId + ' Error: ' + error);
      throw error;
    }
  }
}
export default DatabaseBackoffice;
