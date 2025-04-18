import PQueue from 'p-queue';
import type { TeamSpeak, TeamSpeakClient } from 'ts3-nodejs-library';

import { tsEventEmitter } from '~/teamspeak/tsEventEmitter.ts';
import { tsConnect } from './ts-base';

const queue = new PQueue({ concurrency: 1 });

export const getClients = async (ts: TeamSpeak): Promise<TeamSpeakClient[]> => {
  return (await ts.clientList()).filter((c) => c.type === 0);
};

export const findClient = async (
  ts: TeamSpeak,
  name: string,
): Promise<TeamSpeakClient | undefined> => {
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

    _ts.on('clientconnect', (e) => {
      console.log(`[TS] client +: ${e.client.nickname}`);
      tsEventEmitter.emit('clientconnect', e);
    });

    _ts.on('clientdisconnect', (e) => {
      if (!e.client) return;
      console.log(`[TS] client -: ${e.client.nickname}`);
      tsEventEmitter.emit('clientdisconnect', e);
    });

    _ts.on('clientmoved', (e) => {
      if (!e.client || !e.channel) return;
      console.log(`[TS] client mv: ${e.client.nickname} -> ${e.channel.name}`);
      tsEventEmitter.emit('clientmoved', e);
    });
    console.log('[TS] setup Listeners');
    return _ts;
  });
  if (!value) throw Error('Result from ts queue connect was void');
  return value;
};
