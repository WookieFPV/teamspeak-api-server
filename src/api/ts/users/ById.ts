import type { Context } from 'hono';
import { findClient, getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersById = async (c: Context) => {
  const ts = await getTeamspeakInstance();

  const clientName = c.req.param('name');
  if (!clientName) return new Response('name missing in url', { status: 400 });

  const client = await findClient(ts, clientName);
  if (!client) return new Response(undefined, { status: 404 });

  return new Response(JSON.stringify(client));
};
