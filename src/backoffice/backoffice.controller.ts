import { IUser } from '@/auth/interfaces/auth.iuser';
import { handleError } from '@/utils/utils.error';
import { logError } from '@/utils/utils.logger';
import { Request, Response } from 'express';
import { createClientService, getUserData, patchUserService, updateClientService } from './backoffice.service';
import { IClient } from './interfaces/backoffice.IUserInfoResponse';

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
    return res.status(201).send();
  } catch (error) {
    const msg = 'Error in patchUserController ' + error;
    logError.error(msg);
    return handleError(error, res, msg);
  }
};

export const createClientController = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;
  const client = req.body as IClient;
  try {
    await createClientService(user, client);
    return res.status(201).send();
  } catch (error) {
    const msg = 'Error in createClientController ' + error;
    logError.error(msg);
    return handleError(error, res, msg);
  }
};

export const updateClientController = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as IUser;
  const client = req.body as IClient;
  const clientId = Number(req.params.clientId);

  try {
    await updateClientService(user, clientId, client);
    return res.status(201).send();
  } catch (error) {
    const msg = 'Error in updateClientController ' + error;
    logError.error(msg);
    return handleError(error, res, msg);
  }
};
