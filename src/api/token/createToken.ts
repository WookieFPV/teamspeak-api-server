import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { tokenDb } from '~/auth/tokenStorage.ts';

export const apiTokenPost = async (c: Context) => {
  try {
    const token = tokenDb.tokenCreate();
    return c.json({ token });
  } catch (e) {
    throw new HTTPException(500);
  }
};
