import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsChannels = async (c: Context) => {
  try {
    const ts = await getTeamspeakInstance();
    const channels = await ts.channelList();
    return c.json(channels);
  } catch (_e) {
    throw new HTTPException(500);
  }
};
