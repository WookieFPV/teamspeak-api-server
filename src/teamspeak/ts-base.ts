import { sleep } from 'bun';
import { QueryProtocol, TeamSpeak } from 'ts3-nodejs-library';
import { env } from '../env';

export const tsConnect = async (): Promise<TeamSpeak> => {
  console.log(`[TS] connect (${env.TS3_HOST})`);
  const ts = await TeamSpeak.connect({
    host: env.TS3_HOST,
    queryport: 10011,
    serverport: 9987,
    protocol: QueryProtocol.RAW,
    username: env.TS3_USERNAME,
    nickname: env.TS3_NICKNAME,
    password: env.TS3_PASSWORD,
  }).catch(async (e) => {
    console.log('[TS] tsConnect error', e);
    await sleep(3000);
    console.log('[TS] tsConnect error delay done');
    //an error occurred during connecting
    throw e;
  });
  console.log(`[TS] connect (${env.TS3_HOST}) done`);

  ts.on('close', async (_error): Promise<void> => {
    console.log('[TS] disconnected, trying to reconnect...');
    await ts.reconnect(-1, 3000);
    console.log('[TS] reconnected!');
  });
  console.log('[TS] Connected');
  return ts;
};
