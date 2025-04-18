import { Hono } from 'hono';
import type { JwtVariables } from 'hono/jwt';
import { honoRouteDemo } from '~/api/demo/route.ts';
import { honoRouteToken } from '~/api/token/route.ts';
import { honoRouteTs } from '~/api/ts/route.ts';
import { env } from '~/env.ts';
import { websocket } from '~/websocket.ts';

const api = new Hono<{ Variables: JwtVariables }>().basePath('/api');

// https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
api.route('/ts', honoRouteTs);
api.route('/demo', honoRouteDemo);
api.route('/token', honoRouteToken);

const DEV = env.NODE_ENV === 'development';
if (DEV) console.info('Running in development mode');

const baseSettings = {
  fetch: api.fetch,
  websocket,
};

export default DEV
  ? {
      ...baseSettings,
      port: 80,
    }
  : {
      ...baseSettings,
      port: 443,
      tls: {
        cert: Bun.file('./.ssl/fullchain.pem'),
        key: Bun.file('./.ssl/privkey.pem'),
      },
    };
