import { Request, Response } from 'express';
import crypto from 'crypto';

export const formatDate = async (date: Date): Promise<string> => {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const anio = date.getFullYear();

  return `${dia}-${mes}-${anio}`;
};

export const stringToBoolean = (str) => {
  if (str === undefined) {
    return false;
  }
  if (str.toLowerCase() === 'true') {
    return true;
  } else if (str.toLowerCase() === 'false') {
    return false;
  } else {
    throw new Error('Invalid input: expected "true" or "false"');
  }
};

const allowedOrigins = (process.env.FRONT_SERVER_PORT ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function setCorsForRequest(req: Request, res: Response) {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges');
    res.setHeader('Vary', 'Origin');
  }
}

export function getHashcode(email: string, secret: string): string {
  const lowerEmail = email.toLowerCase();

  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(secret), null);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(lowerEmail, 'utf8'), cipher.final()]);

  const hash = crypto.createHash('md5').update(encrypted).digest('hex');

  return hash;
}
