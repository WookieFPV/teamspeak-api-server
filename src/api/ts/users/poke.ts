import type { Context } from 'hono';
import { findClient, getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersPoke = async (c: Context) => {
  const clientName = c.req.param('name');
  if (!clientName) return new Response('name missing in url', { status: 400 });

  const body = await c.req.text();
  if (!body) return new Response('test missing in body', { status: 400 });

  const ts = await getTeamspeakInstance();
  const client = await findClient(ts, clientName);
  if (!client)
    return new Response(`user ${clientName} not online`, { status: 404 });

  await ts.clientPoke(client.clid, body);
  return new Response('message send', { status: 200 });
};
