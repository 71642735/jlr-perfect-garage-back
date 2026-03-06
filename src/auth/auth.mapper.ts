import { IUser } from './interfaces/auth.iuser';

export const userAuthMapper = async (data: any): Promise<IUser> => {
  const user: IUser = {
    id: data.id,
    role: data?.role,
    email: data?.email,
    password: data?.password,
    status: data?.status,
    failed_login_attempts: data?.failed_login_attempts,
  };

  return user;
};
