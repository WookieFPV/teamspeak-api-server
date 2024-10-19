import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { findClient, getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersPoke = async (c: Context) => {
  const clientName = c.req.param('name');
  if (!clientName)
    throw new HTTPException(400, { message: 'name missing in url' });

  const body = await c.req.text();
  if (!body) throw new HTTPException(400, { message: 'test missing in body' });

  const ts = await getTeamspeakInstance();
  const client = await findClient(ts, clientName);
  if (!client)
    throw new HTTPException(404, { message: `user ${clientName} not online` });

  await ts.clientPoke(client.clid, body);
  return new Response('message send', { status: 200 });
};
