import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { tokenDb } from '~/auth/tokenStorage.ts';

export const apiTokenPost = async (c: Context) => {
  try {
    const token = tokenDb.tokenCreate({
      comment: c.req.query('comment') ?? null,
      issuer: c.req.query('issuer') ?? null,
    });
    return c.json(token);
  } catch (e) {
    throw new HTTPException(500);
  }
};
