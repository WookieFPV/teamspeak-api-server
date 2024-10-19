import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { tokenDb } from '~/auth/tokenStorage.ts';

export const apiTokenDelete = async (c: Context) => {
  const token = c.req.param('token');
  if (!token) throw new HTTPException(400, { message: 'Missing token param' });

  if (!tokenDb.tokenDelete(token))
    throw new HTTPException(404, { message: 'Token not found' });
  return c.status(200);
};
