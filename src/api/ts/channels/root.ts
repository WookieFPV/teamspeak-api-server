import type { Context } from 'hono';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsChannels = async (c: Context) => {
  const ts = await getTeamspeakInstance();
  const channels = await ts.channelList();
  return c.json(channels);
};
