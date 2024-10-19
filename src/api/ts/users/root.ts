import type { Context } from 'hono';
import { getClients, getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsers = async (c: Context) => {
  const ts = await getTeamspeakInstance();
  const clients = await getClients(ts);
  return c.json(clients);
};
