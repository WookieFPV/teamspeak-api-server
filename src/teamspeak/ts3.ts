import PQueue from 'p-queue';
import type { TeamSpeak } from 'ts3-nodejs-library';
import { tsConnect } from './ts-base';

const queue = new PQueue({ concurrency: 1 });

export const getClients = async (ts: TeamSpeak) => {
  return (await ts.clientList()).filter((c) => c.type === 0);
};

export const findClient = async (ts: TeamSpeak, name: string) => {
  return (await ts.clientList()).find((c) => c.nickname === name);
};

let ts: null | TeamSpeak = null;
export const getTeamspeakInstance = async (): Promise<TeamSpeak> => {
  const value = await queue.add(async (): Promise<TeamSpeak> => {
    if (ts) return ts;

    const _ts = await tsConnect();
    ts = _ts;
    _ts.on('error', (e) => {
      console.warn('error ', e);
      ts?.quit();
      ts = null;
    });
    return _ts;
  });
  if (!value) throw Error('Result from ts queue connect was void');
  return value;
};
