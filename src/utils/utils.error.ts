import { Response } from 'express';
import { CustomError } from './utils.custom.error';
import { logError, logInfo } from './utils.logger';

function isDatabaseError(error: any): error is { code: string; sqlMessage: string } {
  return error && typeof error === 'object' && 'code' in error && 'sqlMessage' in error;
}

function extractFieldFromError(errorMessage: string): string | null {
  const regex = /Data too long for column `(.+?)`/;
  const match = regex.exec(errorMessage);
  return match ? match[1] : null;
}

export function handleError(err: any, res: Response, msg: string): Promise<Response> {
  if (err instanceof CustomError) {
    if (err.errorCode === 204) {
      logInfo.info(msg);
      return Promise.resolve(res.status(204).json({ error: 'Not found elements' }));
    }

    logError.error(msg);
    if (err.errorCode === 401) {
      return Promise.resolve(res.status(401).json({ error: 'Forbidden' }));
    }
    if (err.errorCode === 403) {
      return Promise.resolve(res.status(403).json({ error: 'Forbidden' }));
    }

    if (err.errorCode === 404) {
      return Promise.resolve(res.status(403).json({ error: 'Resources not found' }));
    }

    if (err.errorCode === 409) {
      return Promise.resolve(res.status(409).json({ error: 'Conflict' }));
    }
    if (err.errorCode === 400) {
      return Promise.resolve(res.status(400).json({ error: 'Bad request' }));
    }

    if (err.errorCode === 413) {
      const field = extractFieldFromError(err.message);
      return Promise.resolve(
        res.status(413).json({
          error: 'Data too long',
          field: field,
        })
      );
    }
  }
  if (isDatabaseError(err)) {
    if (err.code === 'ER_DUP_ENTRY') {
      return Promise.resolve(
        res.status(409).json({
          error: err.sqlMessage,
        })
      );
    }
  }

  return Promise.resolve(res.status(500).json({ error: 'Error, the operation failed to complete.' + err }));
}
