import { RowDataPacket } from 'mysql2';
import { UserInfoResponse } from './interfaces/backoffice.IUserInfoResponse';

export function mapUserInfoResponse(user: RowDataPacket, clients: RowDataPacket[] | null): UserInfoResponse {
  const response: UserInfoResponse = {
    id: user.user_code,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    preferred_language: user.preferred_language,
    retailer: {
      id: user.retailer_id,
      name: user.retailer_name,
      area_code: user.retailer_area_code,
    },
  };

  if (clients) {
    const clientsMap = new Map<number, any>();

    for (const row of clients) {
      if (!row.client_id) {
        continue;
      }

      let client = clientsMap.get(row.client_id);

      if (!client) {
        client = {
          id: row.client_id,
          first_name: row.client_first_name,
          last_name: row.client_last_name,
          phone: row.client_phone,
          email: row.client_email,
          created: row.client_created,
          referees: [],
          _refereesMap: new Map<number, any>(),
        };

        clientsMap.set(row.client_id, client);
      }

      if (!row.referee_id) {
        continue;
      }

      let referee = client._refereesMap.get(row.referee_id);

      if (!referee) {
        referee = {
          id: row.referee_id,
          first_name: row.referee_first_name,
          last_name: row.referee_last_name,
          email: row.referee_email,
          phone: row.referee_phone,
          created: row.referee_created,
          voucher_number: row.voucher_number,
        };

        client._refereesMap.set(row.referee_id, referee);
        client.referees.push(referee);
      }
    }

    const mappedClients = Array.from(clientsMap.values()).map((client) => {
      delete client._refereesMap;
      return client;
    });

    (response as any).clients = mappedClients;
  }

  return response;
}
