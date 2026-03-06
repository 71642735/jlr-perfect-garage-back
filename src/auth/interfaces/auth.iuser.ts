export interface IUser {
  id: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  failed_login_attempts: number;
  managed_countries?: string[];
}
