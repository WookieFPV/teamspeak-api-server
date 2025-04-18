import { bearerAuth } from 'hono/bearer-auth';
import { tokenExists } from '~/auth/tokenStorage.ts';

export const middlewareAuth = bearerAuth({
  verifyToken: (token) => tokenExists(token),
});
