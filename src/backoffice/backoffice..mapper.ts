import { RowDataPacket } from 'mysql2';
import { UserInfoResponse } from './interfaces/backoffice.IUserInfoResponse';

export function mapUserInfoResponse(user: RowDataPacket): UserInfoResponse {
  const response: UserInfoResponse = {
    id: user.user_code,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    preferred_language: user.preferred_language,
    retailer: {
      id: user.retailer_id,
      name: user.name,
      area_code: user.area_code,
    },
  };

  return response;
}
