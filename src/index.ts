import { Hono } from 'hono';
import type { JwtVariables } from 'hono/jwt';
import { honoRouteDemo } from '~/api/demo/route.ts';
import { honoRouteToken } from '~/api/token/route.ts';
import { honoRouteTs } from '~/api/ts/route.ts';
import { websocket } from '~/websocket.ts';

const api = new Hono<{ Variables: JwtVariables }>().basePath('/api');

// https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
api.route('/ts', honoRouteTs);
api.route('/demo', honoRouteDemo);
api.route('/token', honoRouteToken);

export default {
  port: 3000,
  fetch: api.fetch,
  websocket,
  tls: {
    cert: Bun.file('./.ssl/fullchain.pem'),
    key: Bun.file('./.ssl/privkey.pem'),
  },
};
