import type { Context } from 'hono';
import { ReasonIdentifier } from 'ts3-nodejs-library';
import { getTeamspeakInstance } from '~/teamspeak/ts3.ts';

export const apiTsUsersKick = async (c: Context) => {
  const clientName = c.req.param('name');
  if (!clientName) return new Response('name missing in url', { status: 400 });

  const ts = await getTeamspeakInstance();
  const [client] = await ts.clientFind(clientName);
  if (!client) return new Response(undefined, { status: 404 });

  try {
    await ts.clientKick(
      client.clid,
      ReasonIdentifier.KICK_SERVER,
      'kicked',
      false,
    );
    return new Response(`kicked user ${client.clientNickname}`, {
      status: 200,
    });
  } catch (e) {
    return new Response(undefined, { status: 404 });
  }
};
