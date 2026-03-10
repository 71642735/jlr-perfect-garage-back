import { IUser } from '@/auth/interfaces/auth.iuser';
import { handleError } from '@/utils/utils.error';
import { logError } from '@/utils/utils.logger';
import { Request, Response } from 'express';
import { getUserData, patchUserService } from './backoffice.service';

export const getInfoUserController = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;

  const response = await getUserData(user);

  if (!response) {
    return res.status(204).send();
  }

  return res.status(200).json(response);
};

export const patchUserController = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;
  const lang = req.body.lang as string;

  try {
    await patchUserService(user.id, lang);
    return res.status(200).json({ message: 'Succesfull' });
  } catch (error) {
    const msg = 'Error in patchUserController ' + error;
    logError.error(msg);
    return handleError(error, res, msg);
  }
};
