import { bearerAuth } from 'hono/bearer-auth';
import { tokenDb } from '~/auth/tokenStorage.ts';

export const middlewareAuth = bearerAuth({ token: tokenDb.tokenGetAll() });
