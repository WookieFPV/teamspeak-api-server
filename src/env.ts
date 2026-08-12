import * as process from 'node:process';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    TS3_HOST: z.string(),
    TS3_PASSWORD: z.string(),
    TS3_NICKNAME: z.string().optional(),
    TS3_USERNAME: z.string(),
    TS3_USER_CID: z.string().optional(),
    TS3_QUERY_PORT: z.coerce.number().int().positive().default(10011),
    TS3_SERVER_PORT: z.coerce.number().int().positive().default(9987),
    /**
     * How often the full client list is compared against the last known state.
     * This repairs any event that was missed (teamspeak reconnect, dropped
     * notification, ...) instead of leaving api clients stuck on old data.
     */
    TS3_RECONCILE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(5000)
      .default(60_000),
    /** Interval for the heartbeat event sent to every websocket client. */
    WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(1000).default(30_000),
  })
  .catch((e) => {
    console.log('Invalid Environment Variables (.env file)');
    console.log(e.issues);
    process.exit(1);
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  TS3_HOST: process.env.TS3_HOST,
  TS3_PASSWORD: process.env.TS3_PASSWORD,
  TS3_NICKNAME: process.env.TS3_NICKNAME,
  TS3_USERNAME: process.env.TS3_USERNAME,
  TS3_USER_CID: process.env.TS3_USER_CID,
  TS3_QUERY_PORT: process.env.TS3_QUERY_PORT,
  TS3_SERVER_PORT: process.env.TS3_SERVER_PORT,
  TS3_RECONCILE_INTERVAL_MS: process.env.TS3_RECONCILE_INTERVAL_MS,
  WS_HEARTBEAT_INTERVAL_MS: process.env.WS_HEARTBEAT_INTERVAL_MS,
});
