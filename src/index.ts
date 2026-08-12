import * as process from 'node:process';
import { Hono } from 'hono';
import type { JwtVariables } from 'hono/jwt';
import { honoRouteDemo } from '~/api/demo/route.ts';
import { honoRouteToken } from '~/api/token/route.ts';
import { honoRouteTs } from '~/api/ts/route.ts';
import { env } from '~/env.ts';
import { createLogger } from '~/logger.ts';
import { ensureTsConnection, getTeamspeakInstance } from '~/teamspeak/ts3.ts';
import { websocket } from '~/websocket.ts';

const log = createLogger('APP');

const api = new Hono<{ Variables: JwtVariables }>().basePath('/api');

// https://hono.dev/docs/guides/best-practices#don-t-make-controllers-when-possible
api.route('/ts', honoRouteTs);
api.route('/demo', honoRouteDemo);
api.route('/token', honoRouteToken);

api.onError((err, c) => {
  const status =
    'status' in err && typeof err.status === 'number' ? err.status : 500;
  if (status >= 500)
    log.error(`${c.req.method} ${c.req.path} failed: ${err.message}`, err);
  else log.warn(`${c.req.method} ${c.req.path} -> ${status}: ${err.message}`);
  return c.json({ error: err.message }, status as 500);
});

// a crash here used to take the whole event stream down without a trace
process.on('unhandledRejection', (reason) => {
  log.error('unhandled promise rejection', reason);
});
process.on('uncaughtException', (e) => {
  log.error('uncaught exception', e);
});

const DEV = env.NODE_ENV === 'development';
log.info(
  `starting (env: ${env.NODE_ENV ?? 'production'}, logLevel: ${env.LOG_LEVEL}, reconcile: ${env.TS3_RECONCILE_INTERVAL_MS}ms, heartbeat: ${env.WS_HEARTBEAT_INTERVAL_MS}ms)`,
);

// connect eagerly so the teamspeak connection (and its reconnect + reconcile
// loop) is up before the first client subscribes
getTeamspeakInstance().catch((e) => {
  log.warn(`initial teamspeak connect failed, will retry: ${e.message}`);
  ensureTsConnection();
});

const baseSettings = {
  fetch: api.fetch,
  websocket: {
    ...websocket,
    // detect dead sockets instead of holding them open forever: bun sends
    // ping frames and closes the connection when the peer stops answering
    idleTimeout: 120,
    sendPings: true,
  },
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
