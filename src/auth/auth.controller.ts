import { Request, Response } from 'express';
import {
  loginService,
  updateTokenService,
  createPasswordService,
  forgotPasswordService,
  checkCodeService,
  resendCodeService,
} from './auth.service';
import { IUser } from './interfaces/auth.iuser';
import { logError } from '@/utils/utils.logger';
import { handleError } from '@/utils/utils.error';
import { CustomError } from '@/utils/utils.custom.error';

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const result = await loginService(req.body.email, req.body.password);
    return res.status(200).json(result);
  } catch (error) {
    logError.error('Error in login ' + error);
    if (error instanceof CustomError) {
      if (error.errorCode == 429) {
        return res.status(401).json({ message: 'Retry later' });
      }
    }
    return res.status(401).json('Invalid email or password');
  }
};

export const checkCode = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;
  const code = req.params.code;

  try {
    const result = await checkCodeService(user, code);
    return res.status(200).json(result);
  } catch (error) {
    logError.error('Error in refresh token. Error: ' + error);
    if (error instanceof CustomError) {
      if (error.errorCode != 429) {
        return res.status(401).json({ message: 'Invalid code' });
      }
      return res.status(429).json({ message: 'User blocked. Retry later' });
    }
  }
};

export const resendCode = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;

  try {
    const result = await resendCodeService(user);
    return res.status(200).json(result);
  } catch (error) {
    logError.error('Error in refresh token. Error: ' + error);
    if (error instanceof CustomError) {
      if (error.errorCode != 429) {
        return res.status(401).json({ message: 'Invalid code' });
      }
      return res.status(429).json({ message: 'User blocked. Retry later' });
    }
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;

  try {
    const result = await updateTokenService(user);
    return res.status(200).json(result);
  } catch (error) {
    logError.error('Error in refresh token. Error: ' + error);
    return res.status(500).json({ message: error });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  const email = req.params.email;

  try {
    await forgotPasswordService(email, true);

    return res.status(200).json();
  } catch (error) {
    logError.error('Error in forgotPassword. Error: ' + error);
    return res.status(200).json();
  }
};

export const createNewPassword = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;
  const password = req.body.password;

  try {
    await createPasswordService(user.id, password);
    return res.status(200).json({ message: 'Password updated!' });
  } catch (error) {
    logError.error('Error in createNewPassword. Error: ' + error);
    return handleError(error, res, 'Password updated!');
  }
};
