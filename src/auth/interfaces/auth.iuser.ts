export interface IUser {
  id: string;
  email: string;
  password: string;
  role: string;
  status: string;
  failedLoginAttempts: number;
  areaCode: string;
  lang: string;
  twofaSendLockUntil: Date;
  twofaSendCount: number;
  twofaSendFirstAt: Date;
  lastTwofaSendAt: Date;
  twofaLockUntil: Date;
}
