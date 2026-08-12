import type { Context } from 'hono';
import { getWsHealth } from '~/api/ts/apiTsWs.ts';
import { getTsHealth } from '~/teamspeak/ts3.ts';

const bootDate = new Date().toISOString();

/**
 * Diagnostics for "my client is stuck on old data" reports:
 * - `teamspeak.state` / `lastDisconnectReason`: is the query connection alive?
 * - `teamspeak.driftDetected` / `repairedEvents`: how often events were missed
 *   and had to be repaired by the reconcile poll (should stay at/near 0)
 * - `websocket.connections[].dropped`: events that never reached a client
 */
export const apiTsHealth = async (c: Context) => {
  const teamspeak = getTsHealth();
  return c.json(
    {
      ok: teamspeak.state === 'connected',
      bootDate,
      uptimeSeconds: Math.round(process.uptime()),
      teamspeak,
      websocket: getWsHealth(),
    },
    teamspeak.state === 'connected' ? 200 : 503,
  );
};
