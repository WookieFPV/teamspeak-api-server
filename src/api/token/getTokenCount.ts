import type { Context } from 'hono';
import { tokenDb } from '~/auth/tokenStorage.ts';

export const apiGetTokenCount = async (c: Context) => {
  const tokenCount = tokenDb.tokenGetAll().length;
  return c.json({ tokenCount });
};
