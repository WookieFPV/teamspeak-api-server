import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ReasonIdentifier } from 'ts3-nodejs-library';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersKick = async (c: Context) => {
  const clientName = c.req.param('name');
  if (!clientName)
    throw new HTTPException(400, { message: 'Missing name param' });

  const ts = await getTeamspeakInstance();
  const [client] = await ts.clientFind(clientName);
  if (!client) throw new HTTPException(404);

  try {
    await ts.clientKick(
      client.clid,
      ReasonIdentifier.KICK_SERVER,
      'kicked',
      false,
    );
    return c.text(`kicked user ${client.clientNickname}`, 200);
  } catch (_e) {
    throw new HTTPException(404, { message: `user ${clientName} not online` });
  }
};
