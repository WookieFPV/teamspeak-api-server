import { QueryProtocol, TeamSpeak } from 'ts3-nodejs-library';
import { env } from '../env';
import { createLogger } from '../logger';

const log = createLogger('TS');

/**
 * Opens a new query connection. Connection lifecycle (errors, close,
 * reconnect) is owned by ~/teamspeak/ts3.ts, this function only connects.
 */
export const tsConnect = async (): Promise<TeamSpeak> => {
  const startedAt = Date.now();
  log.info(
    `connecting to ${env.TS3_HOST}:${env.TS3_QUERY_PORT} (server port ${env.TS3_SERVER_PORT})`,
  );
  const ts = await TeamSpeak.connect({
    host: env.TS3_HOST,
    queryport: env.TS3_QUERY_PORT,
    serverport: env.TS3_SERVER_PORT,
    protocol: QueryProtocol.RAW,
    username: env.TS3_USERNAME,
    nickname: env.TS3_NICKNAME,
    password: env.TS3_PASSWORD,
  });
  log.info(`connected to ${env.TS3_HOST} in ${Date.now() - startedAt}ms`);
  return ts;
};
