import { RowDataPacket } from 'mysql2/promise';
import { IUser } from './interfaces/auth.iuser';

export const userAuthMapper = async (data: RowDataPacket): Promise<IUser> => {
  const user: IUser = {
    id: data.user_code,
    role: data.role,
    email: data.email,
    password: data.password,
    status: data.status,
    failedLoginAttempts: data?.failed_login_attempts,
    areaCode: data.area_code,
    lang: data.preferred_language,
    twofaSendLockUntil: data.twofa_send_lock_until,
    twofaSendCount: data.twofa_send_count,
    twofaSendFirstAt: data.twofa_send_first_at,
    lastTwofaSendAt: data.last_twofa_send_at,
    twofaLockUntil: data.twofa_lock_until,
  };

  return user;
};
