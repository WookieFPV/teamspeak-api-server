import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { findClient, getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersById = async (c: Context) => {
  const ts = await getTeamspeakInstance();

  const clientName = c.req.param('name');
  if (!clientName) throw new HTTPException(400);

  const client = await findClient(ts, clientName);
  if (!client) throw new HTTPException(404);

  return new Response(JSON.stringify(client));
};
